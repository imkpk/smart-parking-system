import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ParkingEventStatus,
  Role,
  SlotStatus,
} from '@prisma/client';
import { PaymentClientService } from '../integrations/payment-service/payment-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Injectable()
export class ParkingEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentClientService: PaymentClientService,
  ) {}

  async checkIn(checkInDto: CheckInDto) {
    if (!checkInDto.bookingId && !checkInDto.bookingCode) {
      throw new BadRequestException('bookingId or bookingCode is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: checkInDto.bookingId
          ? { id: checkInDto.bookingId }
          : { bookingCode: checkInDto.bookingCode },
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

      if (booking.slot.status !== SlotStatus.RESERVED) {
        throw new BadRequestException('Booking slot must be RESERVED before check-in');
      }

      const updatedSlots = await tx.slot.updateMany({
        where: {
          id: booking.slotId,
          status: SlotStatus.RESERVED,
        },
        data: {
          status: SlotStatus.OCCUPIED,
        },
      });

      if (updatedSlots.count !== 1) {
        throw new ConflictException('Slot is no longer reserved');
      }

      return tx.parkingEvent.create({
        data: {
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
  }

  async checkOut(checkOutDto: CheckOutDto, authorizationHeader?: string) {
    const parkingEvent = await this.prisma.$transaction(async (tx) => {
      const parkingEvent = await tx.parkingEvent.findUnique({
        where: { id: checkOutDto.parkingEventId },
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

      await tx.slot.update({
        where: { id: parkingEvent.slotId },
        data: {
          status: SlotStatus.AVAILABLE,
        },
      });

      return completedEvent;
    });

    const paymentResult = await this.paymentClientService.initiatePayment(
      {
        parkingEventId: parkingEvent.id,
        bookingId: parkingEvent.bookingId,
        userId: parkingEvent.userId,
        amount: Number(parkingEvent.feeAmount ?? 0),
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

  findActive() {
    return this.prisma.parkingEvent.findMany({
      where: { status: ParkingEventStatus.ACTIVE },
      orderBy: { checkInTime: 'desc' },
    });
  }

  findHistory(user: SafeUser) {
    const where =
      user.role === Role.USER
        ? { userId: user.id }
        : {};

    return this.prisma.parkingEvent.findMany({
      where,
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

  findAll() {
    return this.prisma.parkingEvent.findMany({
      orderBy: { checkInTime: 'desc' },
    });
  }

  async findOne(id: number, currentUser: SafeUser) {
    const parkingEvent = await this.prisma.parkingEvent.findUnique({
      where: { id },
    });

    if (!parkingEvent) {
      throw new NotFoundException('Parking event not found');
    }

    if (
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.SECURITY ||
      parkingEvent.userId === currentUser.id
    ) {
      return parkingEvent;
    }

    throw new ForbiddenException('You can only view your own parking history');
  }

  private calculateFee(durationMinutes: number) {
    if (durationMinutes <= 60) {
      return 50;
    }

    const additionalHours = Math.ceil((durationMinutes - 60) / 60);
    return 50 + additionalHours * 30;
  }
}
