import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, Role, SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { SlotLifecycleService } from '../slots/slot-lifecycle.service';
import { adminUser, normalUser } from '../test/test-users';
import { org1, org2 } from '../test/test-tenant-fixtures';
import { bookingListInclude, presentBooking } from './booking.presenter';
import { BookingsService } from './bookings.service';

function buildEnrichedBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: org1.booking.id,
    organizationId: DEFAULT_ORGANIZATION_ID,
    bookingCode: org1.booking.bookingCode,
    userId: normalUser.id,
    vehicleId: org1.vehicle.id,
    slotId: org1.slot.id,
    parkingLotId: org1.parkingLot.id,
    status: BookingStatus.CONFIRMED,
    startTime: new Date('2026-06-14T10:00:00.000Z'),
    endTime: new Date('2026-06-14T18:00:00.000Z'),
    createdAt: new Date('2026-06-14T10:00:00.000Z'),
    updatedAt: new Date('2026-06-14T10:00:00.000Z'),
    user: {
      id: normalUser.id,
      name: normalUser.name,
      email: normalUser.email,
      phone: normalUser.phone,
    },
    vehicle: { id: org1.vehicle.id, vehicleNumber: org1.vehicle.vehicleNumber },
    parkingLot: { id: org1.parkingLot.id, name: org1.parkingLot.name },
    slot: {
      id: org1.slot.id,
      slotNumber: org1.slot.slotNumber,
      floor: { id: org1.floor.id, name: org1.floor.name },
    },
    ...overrides,
  };
}

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    $transaction: jest.Mock;
    booking: {
      count: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
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
    organizationId: normalUser.organizationId,
    vehicleNumber: 'TS09EA1234',
    vehicleType: VehicleType.CAR,
  };

  const slot = {
    id: 20,
    slotType: SlotType.CAR,
    status: SlotStatus.AVAILABLE,
    floor: {
      parkingLotId: 30,
      parkingLot: { id: 30, isActive: true, organizationId: DEFAULT_ORGANIZATION_ID },
    },
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      booking: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
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
    const usageLimitsService = { checkLimit: jest.fn().mockResolvedValue(undefined) };
    service = new BookingsService(
      prisma as never,
      new AccessPolicyService(),
      slotLifecycleService,
      usageLimitsService as never,
    );
  });

  it('creates a confirmed booking and reserves the slot', async () => {
    const booking = buildEnrichedBooking({ id: 100, slotId: slot.id });
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
        organizationId: normalUser.organizationId,
        userId: normalUser.id,
        vehicleId: vehicle.id,
        slotId: slot.id,
        parkingLotId: slot.floor.parkingLotId,
        status: BookingStatus.CONFIRMED,
        bookingCode: expect.stringMatching(/^BK-/),
      }),
      include: bookingListInclude,
    });
    expect(result).toEqual(presentBooking(booking));
  });

  it('maps duplicate booking code prisma errors to conflict', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue(slot);
    prisma.booking.count.mockResolvedValue(0);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.booking.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['bookingCode'] },
      }),
    );

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toThrow('Booking code already exists');
  });

  it('prevents booking when organization context is missing', async () => {
    await expect(
      service.create({ ...normalUser, organizationId: null }, {
        vehicleId: vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
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

  it('cannot book with a vehicle from another organization', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await expect(
      service.create(normalUser, {
        vehicleId: org2.vehicle.id,
        slotId: slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
      where: {
        id: org2.vehicle.id,
        userId: normalUser.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
  });

  it('cannot book a slot from another organization', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.slot.findFirst.mockResolvedValue(null);

    await expect(
      service.create(normalUser, {
        vehicleId: vehicle.id,
        slotId: org2.slot.id,
        startTime: '2026-06-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
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
    prisma.booking.create.mockResolvedValue(buildEnrichedBooking({ id: 101 }));

    await service.create(normalUser, {
      vehicleId: vehicle.id,
      slotId: slot.id,
      startTime: '2026-06-14T10:00:00.000Z',
    });

    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endTime: undefined,
      }),
      include: bookingListInclude,
    });
  });

  it('lists current user bookings scoped to organization', async () => {
    const booking = buildEnrichedBooking({ id: 1, userId: normalUser.id });
    prisma.booking.findMany.mockResolvedValue([booking]);

    const result = await service.findMine(normalUser);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { userId: normalUser.id, organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { id: 'desc' },
      include: bookingListInclude,
    });
    expect(result).toEqual([presentBooking(booking)]);
  });

  it('lists all bookings scoped to organization', async () => {
    const booking = buildEnrichedBooking({ id: org1.booking.id });
    prisma.booking.findMany.mockResolvedValue([booking]);

    const result = await service.findAll(adminUser);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { id: 'desc' },
      include: bookingListInclude,
    });
    expect(result).toEqual([presentBooking(booking)]);
  });

  it('cancels an active booking and releases the slot', async () => {
    const booking = {
      id: 1,
      userId: normalUser.id,
      slotId: slot.id,
      status: BookingStatus.CONFIRMED,
    };
    const cancelledBooking = buildEnrichedBooking({
      ...booking,
      status: BookingStatus.CANCELLED,
    });
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue(cancelledBooking);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.cancel(booking.id, normalUser);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
      include: bookingListInclude,
    });
    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: slot.id, status: SlotStatus.RESERVED },
      data: { status: SlotStatus.AVAILABLE },
    });
    expect(result).toEqual(presentBooking(cancelledBooking));
  });

  it('allows admin to view any booking in their organization', async () => {
    const booking = buildEnrichedBooking({ id: 1, userId: normalUser.id });
    prisma.booking.findFirst.mockResolvedValue(booking);

    await expect(service.findOne(1, adminUser)).resolves.toEqual(presentBooking(booking));
  });

  it('allows security to view any booking in their organization', async () => {
    const booking = buildEnrichedBooking({ id: 1, userId: normalUser.id });
    prisma.booking.findFirst.mockResolvedValue(booking);

    await expect(
      service.findOne(1, { ...adminUser, role: Role.SECURITY }),
    ).resolves.toEqual(presentBooking(booking));
  });

  it('allows users to view their own booking', async () => {
    const booking = buildEnrichedBooking({ id: 1, userId: normalUser.id });
    prisma.booking.findFirst.mockResolvedValue(booking);

    await expect(service.findOne(1, normalUser)).resolves.toEqual(presentBooking(booking));
  });

  it('blocks users from viewing another user booking', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 1, userId: 999 });

    await expect(service.findOne(1, normalUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when finding a missing booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

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
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(service.cancel(404, normalUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks users from cancelling another user booking', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 1,
      userId: 999,
      slotId: slot.id,
      status: BookingStatus.CONFIRMED,
    });

    await expect(service.cancel(1, normalUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks cancelling inactive bookings', async () => {
    prisma.booking.findFirst.mockResolvedValue({
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
    const cancelledBooking = buildEnrichedBooking({
      ...booking,
      status: BookingStatus.CANCELLED,
    });
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue(cancelledBooking);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.cancel(booking.id, adminUser);

    expect(result).toEqual(presentBooking(cancelledBooking));
  });
});