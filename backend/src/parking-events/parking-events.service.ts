import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ParkingEventStatus,
} from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { PaymentClientService } from '../integrations/payment-service/payment-client.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SlotLifecycleService } from '../slots/slot-lifecycle.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

const PARKING_EVENT_UNIQUE_MESSAGES = {
  bookingId: 'Parking event already exists for this booking',
};

@Injectable()
export class ParkingEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
    private readonly paymentClientService: PaymentClientService,
    private readonly slotLifecycleService: SlotLifecycleService,
  ) {}

  async checkIn(checkInDto: CheckInDto, currentUser: SafeUser) {
    if (!checkInDto.bookingId && !checkInDto.bookingCode) {
      throw new BadRequestException('bookingId or bookingCode is required');
    }

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: {
            ...(checkInDto.bookingId
              ? { id: checkInDto.bookingId }
              : { bookingCode: checkInDto.bookingCode }),
            organizationId,
          },
          include: {
            slot: true,
          },
        });

        if (!booking) {
          throw new NotFoundException('Booking not found');
        }

        if (booking.status !== BookingStatus.CONFIRMED) {
          throw new BadRequestException('Only CONFIRMED bookings can be checked in');
        }

        const activeEvent = await tx.parkingEvent.findFirst({
          where: {
            bookingId: booking.id,
            status: ParkingEventStatus.ACTIVE,
          },
        });

        if (activeEvent) {
          throw new ConflictException('Booking is already checked in');
        }

        const existingEvent = await tx.parkingEvent.findUnique({
          where: { bookingId: booking.id },
        });

        if (existingEvent) {
          throw new ConflictException('Parking event already exists for this booking');
        }

        await this.slotLifecycleService.validateSlotReserved(booking.slotId, tx);
        await this.slotLifecycleService.occupySlot(booking.slotId, tx);

        return tx.parkingEvent.create({
          data: {
            organizationId: booking.organizationId,
            bookingId: booking.id,
            userId: booking.userId,
            vehicleId: booking.vehicleId,
            slotId: booking.slotId,
            parkingLotId: booking.parkingLotId,
            checkInTime: new Date(),
            status: ParkingEventStatus.ACTIVE,
          },
        });
      });
    } catch (error) {
      handlePrismaUniqueConstraint(
        error,
        PARKING_EVENT_UNIQUE_MESSAGES,
        'Parking event already exists for this booking',
      );
    }
  }

  async checkOut(
    checkOutDto: CheckOutDto,
    currentUser: SafeUser,
    authorizationHeader?: string,
  ) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    const parkingEvent = await this.prisma.$transaction(async (tx) => {
      const parkingEvent = await tx.parkingEvent.findFirst({
        where: {
          id: checkOutDto.parkingEventId,
          organizationId,
        },
      });

      if (!parkingEvent) {
        throw new NotFoundException('Parking event not found');
      }

      if (parkingEvent.status !== ParkingEventStatus.ACTIVE) {
        throw new BadRequestException('Only ACTIVE parking events can be checked out');
      }

      const checkOutTime = new Date();
      const durationMinutes = Math.max(
        0,
        Math.ceil(
          (checkOutTime.getTime() - parkingEvent.checkInTime.getTime()) / 60000,
        ),
      );
      const feeAmount = this.calculateFee(durationMinutes);

      const completedEvent = await tx.parkingEvent.update({
        where: { id: parkingEvent.id },
        data: {
          status: ParkingEventStatus.COMPLETED,
          checkOutTime,
          durationMinutes,
          feeAmount,
        },
      });

      await tx.booking.update({
        where: { id: parkingEvent.bookingId },
        data: {
          status: BookingStatus.COMPLETED,
        },
      });

      await this.slotLifecycleService.releaseOccupiedSlot(parkingEvent.slotId, tx);

      return completedEvent;
    });

    const feeAmount = Number(parkingEvent.feeAmount ?? 0);
    const paymentResult =
      feeAmount < 0.01
        ? {
            paymentInitiated: false as const,
            paymentError: 'Payment not required for zero fee',
          }
        : await this.paymentClientService.initiatePayment(
            {
              parkingEventId: parkingEvent.id,
              bookingId: parkingEvent.bookingId,
              userId: parkingEvent.userId,
              amount: feeAmount,
              currency: 'INR',
              paymentMethod: 'MOCK',
            },
            authorizationHeader,
          );

    return {
      parkingEvent,
      ...paymentResult,
    };
  }

  findActive(currentUser: SafeUser) {
    return this.prisma.parkingEvent.findMany({
      where: {
        status: ParkingEventStatus.ACTIVE,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
      orderBy: { checkInTime: 'desc' },
    });
  }

  findHistory(user: SafeUser) {
    return this.prisma.parkingEvent.findMany({
      where: this.accessPolicy.buildUserScopedWhere(user),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        booking: true,
        vehicle: true,
        slot: true,
        parkingLot: true,
      },
    });
  }

  findAll(currentUser: SafeUser) {
    return this.prisma.parkingEvent.findMany({
      where: this.accessPolicy.buildOrganizationWhere(currentUser),
      orderBy: { checkInTime: 'desc' },
    });
  }

  async findOne(id: number, currentUser: SafeUser) {
    const parkingEvent = await this.prisma.parkingEvent.findFirst({
      where: {
        id,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
    });

    if (!parkingEvent) {
      throw new NotFoundException('Parking event not found');
    }

    this.accessPolicy.assertCanViewUserOwnedRecord(
      currentUser,
      parkingEvent.userId,
      'You can only view your own parking history',
    );

    return parkingEvent;
  }

  private calculateFee(durationMinutes: number) {
    if (durationMinutes <= 60) {
      return 50;
    }

    const additionalHours = Math.ceil((durationMinutes - 60) / 60);
    return 50 + additionalHours * 30;
  }
}