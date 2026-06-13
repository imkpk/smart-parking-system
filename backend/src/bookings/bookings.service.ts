import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Role, SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateBookingDto } from './dto/create-booking.dto';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentUser: SafeUser, createBookingDto: CreateBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({
        where: {
          id: createBookingDto.vehicleId,
          userId: currentUser.id,
        },
      });

      if (!vehicle) {
        throw new ForbiddenException('You can only book with your own vehicle');
      }

      const slot = await tx.slot.findUnique({
        where: { id: createBookingDto.slotId },
        include: {
          floor: {
            include: {
              parkingLot: true,
            },
          },
        },
      });

      if (!slot || !slot.floor.parkingLot.isActive) {
        throw new NotFoundException('Slot not found');
      }

      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new ConflictException('Slot is not available');
      }

      if (slot.slotType !== this.toSlotType(vehicle.vehicleType)) {
        throw new BadRequestException('Slot type does not match vehicle type');
      }

      const activeBookingCount = await tx.booking.count({
        where: {
          slotId: slot.id,
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
      });

      if (activeBookingCount > 0) {
        throw new ConflictException('Slot is already booked');
      }

      const updatedSlots = await tx.slot.updateMany({
        where: {
          id: slot.id,
          status: SlotStatus.AVAILABLE,
        },
        data: {
          status: SlotStatus.RESERVED,
        },
      });

      if (updatedSlots.count !== 1) {
        throw new ConflictException('Slot is not available');
      }

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

    if (
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.SECURITY ||
      booking.userId === currentUser.id
    ) {
      return booking;
    }

    throw new ForbiddenException('You can only view your own bookings');
  }

  async cancel(id: number, currentUser: SafeUser) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (currentUser.role !== Role.ADMIN && booking.userId !== currentUser.id) {
        throw new ForbiddenException('You can only cancel your own bookings');
      }

      if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
        throw new BadRequestException('Only active bookings can be cancelled');
      }

      const cancelledBooking = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      return cancelledBooking;
    });
  }

  private toSlotType(vehicleType: VehicleType): SlotType {
    return vehicleType as unknown as SlotType;
  }

  private generateBookingCode() {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `BK-${Date.now()}-${random}`;
  }
}
