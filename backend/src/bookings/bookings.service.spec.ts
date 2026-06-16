import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Role, SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { SlotLifecycleService } from '../slots/slot-lifecycle.service';
import { BookingsService } from './bookings.service';
import { adminUser, normalUser } from '../test/test-users';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    $transaction: jest.Mock;
    booking: {
      count: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    slot: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    vehicle: { findFirst: jest.Mock };
  };

  const vehicle = {
    id: 10,
    userId: normalUser.id,
    vehicleNumber: 'TS09EA1234',
    vehicleType: VehicleType.CAR,
  };

  const slot = {
    id: 20,
    slotType: SlotType.CAR,
    status: SlotStatus.AVAILABLE,
    floor: {
      parkingLotId: 30,
      parkingLot: { id: 30, isActive: true },
    },
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      booking: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      slot: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      vehicle: { findFirst: jest.fn() },
    };
    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    const slotLifecycleService = new SlotLifecycleService(
      prisma as never,
      parkingLotValidationService,
    );
    service = new BookingsService(prisma as never, slotLifecycleService);
  });

  it('creates a confirmed booking and reserves the slot', async () => {
    const booking = { id: 100, status: BookingStatus.CONFIRMED, slotId: slot.id };
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue(slot);
    prisma.booking.count.mockResolvedValue(0);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.booking.create.mockResolvedValue(booking);

    const result = await service.create(normalUser, {
      vehicleId: vehicle.id,
      slotId: slot.id,
      startTime: '2026-06-14T10:00:00.000Z',
      endTime: '2026-06-14T18:00:00.000Z',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: slot.id, status: SlotStatus.AVAILABLE },
      data: { status: SlotStatus.RESERVED },
    });
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: normalUser.id,
        vehicleId: vehicle.id,
        slotId: slot.id,
        parkingLotId: slot.floor.parkingLotId,
        status: BookingStatus.CONFIRMED,
        bookingCode: expect.stringMatching(/^BK-/),
      }),
    });
    expect(result).toBe(booking);
  });

  it('prevents booking with someone else vehicle', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await expect(
      service.create(normalUser, {
        vehicleId: 999,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents booking unavailable slots', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue({ ...slot, status: SlotStatus.RESERVED });

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents booking a slot in an inactive parking lot', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue(null);

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents vehicle and slot type mismatch', async () => {
    prisma.vehicle.findFirst.mockResolvedValue({ ...vehicle, vehicleType: VehicleType.BIKE });
    prisma.slot.findFirst.mockResolvedValue(slot);

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents double booking when an active booking already exists', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue(slot);
    prisma.booking.count.mockResolvedValue(1);

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('handles stale slot availability during reservation', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue(slot);
    prisma.booking.count.mockResolvedValue(0);
    prisma.slot.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a booking without end time', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue(slot);
    prisma.booking.count.mockResolvedValue(0);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.booking.create.mockResolvedValue({ id: 101 });

    await service.create(normalUser, {
      vehicleId: vehicle.id,
      slotId: slot.id,
      startTime: '2026-06-14T10:00:00.000Z',
    });

    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endTime: undefined,
      }),
    });
  });

  it('lists current user bookings', async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 1, userId: normalUser.id }]);

    const result = await service.findMine(normalUser.id);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { userId: normalUser.id },
      orderBy: { id: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('lists all bookings', async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 1 }]);

    const result = await service.findAll();

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('cancels an active booking and releases the slot', async () => {
    const booking = {
      id: 1,
      userId: normalUser.id,
      slotId: slot.id,
      status: BookingStatus.CONFIRMED,
    };
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.cancel(booking.id, normalUser);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });
    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: slot.id, status: SlotStatus.RESERVED },
      data: { status: SlotStatus.AVAILABLE },
    });
    expect(result.status).toBe(BookingStatus.CANCELLED);
  });

  it('allows admin to view any booking', async () => {
    const booking = { id: 1, userId: normalUser.id };
    prisma.booking.findUnique.mockResolvedValue(booking);

    await expect(service.findOne(1, adminUser)).resolves.toBe(booking);
  });

  it('allows security to view any booking', async () => {
    const booking = { id: 1, userId: normalUser.id };
    prisma.booking.findUnique.mockResolvedValue(booking);

    await expect(
      service.findOne(1, { ...adminUser, role: Role.SECURITY }),
    ).resolves.toBe(booking);
  });

  it('allows users to view their own booking', async () => {
    const booking = { id: 1, userId: normalUser.id };
    prisma.booking.findUnique.mockResolvedValue(booking);

    await expect(service.findOne(1, normalUser)).resolves.toBe(booking);
  });

  it('blocks users from viewing another user booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 1, userId: 999 });

    await expect(service.findOne(1, normalUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when finding a missing booking', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(service.findOne(404, normalUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when booking is missing', async () => {
    prisma.slot.findFirst.mockResolvedValue(null);
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: 404,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when cancelling a missing booking', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(service.cancel(404, normalUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks users from cancelling another user booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 1,
      userId: 999,
      slotId: slot.id,
      status: BookingStatus.CONFIRMED,
    });

    await expect(service.cancel(1, normalUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks cancelling inactive bookings', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 1,
      userId: normalUser.id,
      slotId: slot.id,
      status: BookingStatus.COMPLETED,
    });

    await expect(service.cancel(1, normalUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows admin to cancel another user active booking', async () => {
    const booking = {
      id: 1,
      userId: normalUser.id,
      slotId: slot.id,
      status: BookingStatus.PENDING,
    };
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.cancel(booking.id, adminUser);

    expect(result.status).toBe(BookingStatus.CANCELLED);
  });
});
