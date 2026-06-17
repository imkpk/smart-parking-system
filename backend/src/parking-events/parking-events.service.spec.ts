import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, ParkingEventStatus, Prisma, Role, SlotStatus } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { SlotLifecycleService } from '../slots/slot-lifecycle.service';
import { adminUser, normalUser, securityUser } from '../test/test-users';
import { org1, org2 } from '../test/test-tenant-fixtures';
import {
  parkingEventListInclude,
  presentParkingEvent,
} from './parking-event.presenter';
import { ParkingEventsService } from './parking-events.service';

function buildEnrichedParkingEvent(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: org1.parkingEvent.id,
    organizationId: DEFAULT_ORGANIZATION_ID,
    bookingId: org1.booking.id,
    userId: normalUser.id,
    vehicleId: org1.vehicle.id,
    slotId: org1.slot.id,
    parkingLotId: org1.parkingLot.id,
    checkInTime: new Date('2026-06-14T10:00:00.000Z'),
    checkOutTime: null,
    status: ParkingEventStatus.ACTIVE,
    durationMinutes: null,
    feeAmount: null,
    createdAt: new Date('2026-06-14T10:00:00.000Z'),
    updatedAt: new Date('2026-06-14T10:00:00.000Z'),
    booking: { id: org1.booking.id, bookingCode: org1.booking.bookingCode },
    vehicle: { id: org1.vehicle.id, vehicleNumber: org1.vehicle.vehicleNumber },
    slot: {
      id: org1.slot.id,
      slotNumber: org1.slot.slotNumber,
      floor: { id: org1.floor.id, name: org1.floor.name },
    },
    parkingLot: { id: org1.parkingLot.id, name: org1.parkingLot.name },
    user: {
      id: normalUser.id,
      name: normalUser.name,
      email: normalUser.email,
      phone: normalUser.phone,
    },
    ...overrides,
  };
}

describe('ParkingEventsService', () => {
  let service: ParkingEventsService;
  let paymentClientService: {
    initiatePayment: jest.Mock;
  };
  let prisma: {
    $transaction: jest.Mock;
    booking: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    parkingEvent: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    slot: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const booking = {
    id: 1,
    bookingCode: 'BK-TEST',
    organizationId: normalUser.organizationId,
    userId: normalUser.id,
    vehicleId: 10,
    slotId: 20,
    parkingLotId: 30,
    status: BookingStatus.CONFIRMED,
    slot: { id: 20, status: SlotStatus.RESERVED },
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      booking: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      parkingEvent: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      slot: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    paymentClientService = {
      initiatePayment: jest.fn().mockResolvedValue({
        paymentInitiated: true,
        payment: { id: 1, status: 'INITIATED' },
      }),
    };
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    const slotLifecycleService = new SlotLifecycleService(
      prisma as never,
      parkingLotValidationService,
    );
    service = new ParkingEventsService(
      prisma as never,
      new AccessPolicyService(),
      paymentClientService as never,
      slotLifecycleService,
    );
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requires booking id or booking code for check-in', async () => {
    await expect(service.checkIn({}, securityUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks in a confirmed booking and marks slot occupied', async () => {
    const parkingEvent = buildEnrichedParkingEvent({ id: 100, bookingId: booking.id });
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue(booking.slot);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.parkingEvent.create.mockResolvedValue(parkingEvent);

    const result = await service.checkIn({ bookingCode: booking.bookingCode }, securityUser);

    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        bookingCode: booking.bookingCode,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
      include: { slot: true },
    });
    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: booking.slotId, status: SlotStatus.RESERVED },
      data: { status: SlotStatus.OCCUPIED },
    });
    expect(prisma.parkingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: booking.organizationId,
        bookingId: booking.id,
        userId: booking.userId,
        vehicleId: booking.vehicleId,
        slotId: booking.slotId,
        parkingLotId: booking.parkingLotId,
        status: ParkingEventStatus.ACTIVE,
      }),
      include: parkingEventListInclude,
    });
    expect(result).toEqual(presentParkingEvent(parkingEvent));
  });

  it('checks in by booking id', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue(booking.slot);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.parkingEvent.create.mockResolvedValue(
      buildEnrichedParkingEvent({ id: 100, bookingId: booking.id }),
    );

    await service.checkIn({ bookingId: booking.id }, securityUser);

    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        id: booking.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
      include: { slot: true },
    });
  });

  it('rejects check-in for a booking in another organization', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.checkIn({ bookingId: org2.booking.id }, securityUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        id: org2.booking.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
      include: { slot: true },
    });
  });

  it('maps duplicate parking event prisma errors to conflict', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue(booking.slot);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.parkingEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['bookingId'] },
      }),
    );

    await expect(
      service.checkIn({ bookingId: booking.id }, securityUser),
    ).rejects.toThrow('Parking event already exists for this booking');
  });

  it('throws when check-in booking is missing', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.checkIn({ bookingId: 404 }, securityUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects check-in for non-confirmed booking', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      ...booking,
      status: BookingStatus.CANCELLED,
    });

    await expect(
      service.checkIn({ bookingId: booking.id }, securityUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks duplicate check-in for a booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue({
      id: 100,
      status: ParkingEventStatus.ACTIVE,
    });

    await expect(
      service.checkIn({ bookingId: booking.id }, securityUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks check-in when a parking event already exists', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue({
      id: 100,
      status: ParkingEventStatus.COMPLETED,
    });

    await expect(
      service.checkIn({ bookingId: booking.id }, securityUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects check-in when slot is not reserved', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      ...booking,
      slot: { ...booking.slot, status: SlotStatus.AVAILABLE },
    });
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue({
      ...booking.slot,
      status: SlotStatus.AVAILABLE,
    });

    await expect(
      service.checkIn({ bookingId: booking.id }, securityUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('handles stale reserved slot during check-in', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue(booking.slot);
    prisma.slot.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.checkIn({ bookingId: booking.id }, securityUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks out an active parking event, completes booking, and releases slot', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T12:01:00.000Z'));
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue(
      buildEnrichedParkingEvent({
        ...activeEvent,
        userId: booking.userId,
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 121,
        feeAmount: 110,
      }),
    );
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.checkOut({ parkingEventId: activeEvent.id }, securityUser);

    expect(prisma.parkingEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: activeEvent.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
    expect(prisma.parkingEvent.update).toHaveBeenCalledWith({
      where: { id: activeEvent.id },
      data: expect.objectContaining({
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 121,
        feeAmount: 110,
      }),
      include: parkingEventListInclude,
    });
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: booking.id },
      data: { status: BookingStatus.COMPLETED },
    });
    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: booking.slotId, status: SlotStatus.OCCUPIED },
      data: { status: SlotStatus.AVAILABLE },
    });
    expect(paymentClientService.initiatePayment).toHaveBeenCalledWith(
      {
        parkingEventId: activeEvent.id,
        bookingId: booking.id,
        userId: booking.userId,
        amount: 110,
        currency: 'INR',
        paymentMethod: 'MOCK',
      },
      undefined,
    );
    expect(result).toEqual({
      parkingEvent: expect.objectContaining({ feeAmount: 110 }),
      paymentInitiated: true,
      payment: { id: 1, status: 'INITIATED' },
    });
  });

  it('rejects check-out for a parking event in another organization', async () => {
    prisma.parkingEvent.findFirst.mockResolvedValue(null);

    await expect(
      service.checkOut({ parkingEventId: org2.parkingEvent.id }, securityUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.parkingEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: org2.parkingEvent.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
  });

  it('charges the base fee for 60 minutes or less', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T10:30:00.000Z'));
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue(
      buildEnrichedParkingEvent({
        ...activeEvent,
        userId: booking.userId,
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 30,
        feeAmount: 50,
      }),
    );

    await service.checkOut({ parkingEventId: activeEvent.id }, securityUser);

    expect(prisma.parkingEvent.update).toHaveBeenCalledWith({
      where: { id: activeEvent.id },
      data: expect.objectContaining({
        durationMinutes: 30,
        feeAmount: 50,
      }),
      include: parkingEventListInclude,
    });
  });

  it('never returns a negative duration when checkout time is before check-in time', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T09:59:00.000Z'));
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue(
      buildEnrichedParkingEvent({
        ...activeEvent,
        userId: booking.userId,
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 0,
        feeAmount: 50,
      }),
    );

    await service.checkOut({ parkingEventId: activeEvent.id }, securityUser);

    expect(prisma.parkingEvent.update).toHaveBeenCalledWith({
      where: { id: activeEvent.id },
      data: expect.objectContaining({
        durationMinutes: 0,
        feeAmount: 50,
      }),
      include: parkingEventListInclude,
    });
  });

  it('completes checkout when payment service fails', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T10:30:00.000Z'));
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      userId: booking.userId,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue(
      buildEnrichedParkingEvent({
        ...activeEvent,
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 30,
        feeAmount: 50,
      }),
    );
    paymentClientService.initiatePayment.mockResolvedValue({
      paymentInitiated: false,
      paymentError: 'Payment service unavailable',
    });

    const result = await service.checkOut({ parkingEventId: activeEvent.id }, securityUser);

    expect(result).toEqual({
      parkingEvent: expect.objectContaining({ status: ParkingEventStatus.COMPLETED }),
      paymentInitiated: false,
      paymentError: 'Payment service unavailable',
    });
  });

  it('skips payment initiation when completed event has no fee amount', async () => {
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      userId: booking.userId,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue(
      buildEnrichedParkingEvent({
        ...activeEvent,
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 0,
        feeAmount: null,
      }),
    );

    const result = await service.checkOut({ parkingEventId: activeEvent.id }, securityUser);

    expect(paymentClientService.initiatePayment).not.toHaveBeenCalled();
    expect(result).toEqual({
      parkingEvent: expect.objectContaining({ status: ParkingEventStatus.COMPLETED }),
      paymentInitiated: false,
      paymentError: 'Payment not required for zero fee',
    });
  });

  it('passes authorization header to payment client during checkout', async () => {
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      userId: booking.userId,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue(
      buildEnrichedParkingEvent({
        ...activeEvent,
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 30,
        feeAmount: 50,
      }),
    );

    await service.checkOut({ parkingEventId: activeEvent.id }, securityUser, 'Bearer security-token');

    expect(paymentClientService.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50 }),
      'Bearer security-token',
    );
  });

  it('throws when checkout parking event is missing', async () => {
    prisma.parkingEvent.findFirst.mockResolvedValue(null);

    await expect(
      service.checkOut({ parkingEventId: 404 }, securityUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects checkout for non-active events', async () => {
    prisma.parkingEvent.findFirst.mockResolvedValue({
      id: 100,
      status: ParkingEventStatus.COMPLETED,
    });

    await expect(
      service.checkOut({ parkingEventId: 100 }, securityUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists active parking events scoped to organization', async () => {
    const event = buildEnrichedParkingEvent({ id: 1, status: ParkingEventStatus.ACTIVE });
    prisma.parkingEvent.findMany.mockResolvedValue([event]);

    const result = await service.findActive(securityUser);

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith({
      where: { status: ParkingEventStatus.ACTIVE, organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { checkInTime: 'desc' },
      include: parkingEventListInclude,
    });
    expect(result).toEqual([presentParkingEvent(event)]);
  });

  it('lists current user parking history scoped to organization', async () => {
    const event = buildEnrichedParkingEvent({ id: 1, userId: normalUser.id });
    prisma.parkingEvent.findMany.mockResolvedValue([event]);

    const result = await service.findHistory(normalUser);

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith({
      where: { userId: normalUser.id, organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { createdAt: 'desc' },
      include: parkingEventListInclude,
    });
    expect(result).toEqual([presentParkingEvent(event)]);
  });

  it('lists all parking events scoped to organization', async () => {
    const event = buildEnrichedParkingEvent({ id: org1.parkingEvent.id });
    prisma.parkingEvent.findMany.mockResolvedValue([event]);

    const result = await service.findAll(adminUser);

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { checkInTime: 'desc' },
      include: parkingEventListInclude,
    });
    expect(result).toEqual([presentParkingEvent(event)]);
  });

  it('allows admin to view any parking event in their organization', async () => {
    const event = buildEnrichedParkingEvent({ id: 1, userId: normalUser.id });
    prisma.parkingEvent.findFirst.mockResolvedValue(event);

    await expect(service.findOne(1, adminUser)).resolves.toEqual(presentParkingEvent(event));
  });

  it('allows security to view any parking event in their organization', async () => {
    const event = buildEnrichedParkingEvent({ id: 1, userId: normalUser.id });
    prisma.parkingEvent.findFirst.mockResolvedValue(event);

    await expect(
      service.findOne(1, { ...adminUser, role: Role.SECURITY }),
    ).resolves.toEqual(presentParkingEvent(event));
  });

  it('allows users to view their own parking event', async () => {
    const event = buildEnrichedParkingEvent({ id: 1, userId: normalUser.id });
    prisma.parkingEvent.findFirst.mockResolvedValue(event);

    await expect(service.findOne(1, normalUser)).resolves.toEqual(presentParkingEvent(event));
  });

  it('blocks users from viewing another user parking event', async () => {
    prisma.parkingEvent.findFirst.mockResolvedValue({
      id: 1,
      userId: 999,
    });

    await expect(service.findOne(1, normalUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when parking event is missing', async () => {
    prisma.parkingEvent.findFirst.mockResolvedValue(null);

    await expect(service.findOne(404, { ...normalUser, role: Role.USER })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});