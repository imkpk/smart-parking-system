import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';

const BOOKING_UNIQUE_MESSAGES = {
  bookingCode: 'Booking code already exists',
};
import { SlotLifecycleService } from '../slots/slot-lifecycle.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateBookingDto } from './dto/create-booking.dto';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
    private readonly slotLifecycleService: SlotLifecycleService,
  ) {}

  async create(currentUser: SafeUser, createBookingDto: CreateBookingDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findFirst({
          where: {
            id: createBookingDto.vehicleId,
            userId: currentUser.id,
          },
        });

        if (!vehicle) {
          throw new ForbiddenException('You can only book with your own vehicle');
        }

        const slot = await this.slotLifecycleService.validateSlotAvailable(
          createBookingDto.slotId,
          vehicle.vehicleType,
          tx,
        );

        const activeBookingCount = await tx.booking.count({
          where: {
            slotId: slot.id,
            status: { in: ACTIVE_BOOKING_STATUSES },
          },
        });

        if (activeBookingCount > 0) {
          throw new ConflictException('Slot is already booked');
        }

        await this.slotLifecycleService.reserveSlot(slot.id, tx);

        return tx.booking.create({
          data: {
            userId: currentUser.id,
            vehicleId: vehicle.id,
            slotId: slot.id,
            parkingLotId: slot.floor.parkingLotId,
            status: BookingStatus.CONFIRMED,
            startTime: new Date(createBookingDto.startTime),
            endTime: createBookingDto.endTime
              ? new Date(createBookingDto.endTime)
              : undefined,
            bookingCode: this.generateBookingCode(),
          },
        });
      });
    } catch (error) {
      handlePrismaUniqueConstraint(
        error,
        BOOKING_UNIQUE_MESSAGES,
        'Booking code already exists',
      );
    }
  }

  findMine(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
    });
  }

  findAll() {
    return this.prisma.booking.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number, currentUser: SafeUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    this.accessPolicy.assertCanViewUserOwnedRecord(
      currentUser,
      booking.userId,
      'You can only view your own bookings',
    );

    return booking;
  }

  async cancel(id: number, currentUser: SafeUser) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      this.accessPolicy.assertOwnerOrAdmin(
        currentUser,
        booking.userId,
        'You can only cancel your own bookings',
      );

      if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
        throw new BadRequestException('Only active bookings can be cancelled');
      }

      const cancelledBooking = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      });

      await this.slotLifecycleService.releaseReservedSlot(booking.slotId, tx);

      return cancelledBooking;
    });
  }

  private generateBookingCode() {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `BK-${Date.now()}-${random}`;
  }
}