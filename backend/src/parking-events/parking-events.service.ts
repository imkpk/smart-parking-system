import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ParkingEventStatus,
  Prisma,
  SlotStatus,
} from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { PaymentClientService } from '../integrations/payment-service/payment-client.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SlotLifecycleService } from '../slots/slot-lifecycle.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import {
  parkingEventListInclude,
  presentParkingEvent,
  presentParkingEvents,
} from './parking-event.presenter';

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

        const existingEvent = await tx.parkingEvent.findUnique({
          where: { bookingId: booking.id },
        });
        const isReturnVisit = existingEvent?.status === ParkingEventStatus.COMPLETED;

        if (!isReturnVisit && booking.status !== BookingStatus.CONFIRMED) {
          throw new BadRequestException('Only CONFIRMED bookings can be checked in');
        }

        if (
          isReturnVisit &&
          booking.status !== BookingStatus.CONFIRMED &&
          booking.status !== BookingStatus.COMPLETED
        ) {
          throw new BadRequestException('This booking cannot be checked in again');
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

        if (isReturnVisit && existingEvent) {
          await this.ensureSlotReadyForReturnCheckIn(
            booking.slotId,
            booking.organizationId,
            tx,
          );

          if (booking.status === BookingStatus.COMPLETED) {
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: BookingStatus.CONFIRMED,
                endTime: null,
              },
            });
          }

          const reactivatedEvent = await tx.parkingEvent.update({
            where: { id: existingEvent.id },
            data: {
              status: ParkingEventStatus.ACTIVE,
              checkInTime: new Date(),
              checkOutTime: null,
              durationMinutes: null,
              feeAmount: null,
            },
            include: parkingEventListInclude,
          });

          return presentParkingEvent(reactivatedEvent);
        }

        if (existingEvent) {
          throw new ConflictException('Parking event already exists for this booking');
        }

        await this.slotLifecycleService.validateSlotReserved(booking.slotId, tx);
        await this.slotLifecycleService.occupySlot(booking.slotId, tx);

        const createdEvent = await tx.parkingEvent.create({
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
          include: parkingEventListInclude,
        });

        return presentParkingEvent(createdEvent);
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
      const existingEvent = await tx.parkingEvent.findFirst({
        where: {
          id: checkOutDto.parkingEventId,
          organizationId,
        },
      });

      if (!existingEvent) {
        throw new NotFoundException('Parking event not found');
      }

      if (
        existingEvent.status !== ParkingEventStatus.ACTIVE ||
        existingEvent.checkOutTime !== null
      ) {
        throw new ConflictException('This session is already checked out.');
      }

      const checkOutTime = new Date();
      const durationMinutes = Math.max(
        0,
        Math.ceil(
          (checkOutTime.getTime() - existingEvent.checkInTime.getTime()) / 60000,
        ),
      );
      const feeAmount = this.calculateFee(durationMinutes);

      const updateResult = await tx.parkingEvent.updateMany({
        where: {
          id: existingEvent.id,
          organizationId,
          status: ParkingEventStatus.ACTIVE,
          checkOutTime: null,
        },
        data: {
          status: ParkingEventStatus.COMPLETED,
          checkOutTime,
          durationMinutes,
          feeAmount,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('This session is already checked out.');
      }

      const completedEvent = await tx.parkingEvent.findFirst({
        where: { id: existingEvent.id },
        include: parkingEventListInclude,
      });

      if (!completedEvent) {
        throw new NotFoundException('Parking event not found');
      }

      await tx.booking.update({
        where: { id: existingEvent.bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          endTime: null,
        },
      });

      await this.slotLifecycleService.releaseOccupiedSlot(existingEvent.slotId, tx);

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
      parkingEvent: presentParkingEvent(parkingEvent),
      ...paymentResult,
    };
  }

  async findActive(currentUser: SafeUser) {
    const events = await this.prisma.parkingEvent.findMany({
      where: {
        status: ParkingEventStatus.ACTIVE,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
      orderBy: { checkInTime: 'desc' },
      include: parkingEventListInclude,
    });

    return presentParkingEvents(events);
  }

  async findHistory(user: SafeUser) {
    const events = await this.prisma.parkingEvent.findMany({
      where: this.accessPolicy.buildUserScopedWhere(user),
      orderBy: {
        createdAt: 'desc',
      },
      include: parkingEventListInclude,
    });

    return presentParkingEvents(events);
  }

  async findAll(currentUser: SafeUser) {
    const events = await this.prisma.parkingEvent.findMany({
      where: this.accessPolicy.buildOrganizationWhere(currentUser),
      orderBy: { checkInTime: 'desc' },
      include: parkingEventListInclude,
    });

    return presentParkingEvents(events);
  }

  async findOne(id: number, currentUser: SafeUser) {
    const parkingEvent = await this.prisma.parkingEvent.findFirst({
      where: {
        id,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
      include: parkingEventListInclude,
    });

    if (!parkingEvent) {
      throw new NotFoundException('Parking event not found');
    }

    this.accessPolicy.assertCanViewUserOwnedRecord(
      currentUser,
      parkingEvent.userId,
      'You can only view your own parking history',
    );

    return presentParkingEvent(parkingEvent);
  }

  private async ensureSlotReadyForReturnCheckIn(
    slotId: number,
    organizationId: number,
    tx: Prisma.TransactionClient,
  ) {
    const slot = await tx.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.status === SlotStatus.AVAILABLE) {
      await this.slotLifecycleService.occupyAvailableSlot(slotId, tx);
      return;
    }

    if (slot.status === SlotStatus.OCCUPIED) {
      const activeEventOnSlot = await tx.parkingEvent.findFirst({
        where: {
          organizationId,
          slotId,
          status: ParkingEventStatus.ACTIVE,
          checkOutTime: null,
        },
      });

      if (!activeEventOnSlot) {
        return;
      }
    }

    throw new ConflictException('Slot is not available');
  }

  private calculateFee(durationMinutes: number) {
    if (durationMinutes <= 60) {
      return 50;
    }

    const additionalHours = Math.ceil((durationMinutes - 60) / 60);
    return 50 + additionalHours * 30;
  }
}