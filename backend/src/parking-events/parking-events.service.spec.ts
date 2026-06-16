import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, ParkingEventStatus, Role, SlotStatus } from '@prisma/client';
import { SlotLifecycleService } from '../slots/slot-lifecycle.service';
import { ParkingEventsService } from './parking-events.service';
import { adminUser, normalUser } from '../test/test-users';

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
    const slotLifecycleService = new SlotLifecycleService(prisma as never);
    service = new ParkingEventsService(
      prisma as never,
      paymentClientService as never,
      slotLifecycleService,
    );
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requires booking id or booking code for check-in', async () => {
    await expect(service.checkIn({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks in a confirmed booking and marks slot occupied', async () => {
    const parkingEvent = { id: 100, bookingId: booking.id, status: ParkingEventStatus.ACTIVE };
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue(booking.slot);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.parkingEvent.create.mockResolvedValue(parkingEvent);

    const result = await service.checkIn({ bookingCode: booking.bookingCode });

    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: { bookingCode: booking.bookingCode },
      include: { slot: true },
    });
    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: booking.slotId, status: SlotStatus.RESERVED },
      data: { status: SlotStatus.OCCUPIED },
    });
    expect(prisma.parkingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: booking.id,
        userId: booking.userId,
        vehicleId: booking.vehicleId,
        slotId: booking.slotId,
        parkingLotId: booking.parkingLotId,
        status: ParkingEventStatus.ACTIVE,
      }),
    });
    expect(result).toBe(parkingEvent);
  });

  it('checks in by booking id', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue(booking.slot);
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    prisma.parkingEvent.create.mockResolvedValue({ id: 100 });

    await service.checkIn({ bookingId: booking.id });

    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: { id: booking.id },
      include: { slot: true },
    });
  });

  it('throws when check-in booking is missing', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(service.checkIn({ bookingId: 404 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects check-in for non-confirmed booking', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      ...booking,
      status: BookingStatus.CANCELLED,
    });

    await expect(service.checkIn({ bookingId: booking.id })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks duplicate check-in for a booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue({
      id: 100,
      status: ParkingEventStatus.ACTIVE,
    });

    await expect(service.checkIn({ bookingId: booking.id })).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks check-in when a parking event already exists', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue({
      id: 100,
      status: ParkingEventStatus.COMPLETED,
    });

    await expect(service.checkIn({ bookingId: booking.id })).rejects.toBeInstanceOf(ConflictException);
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

    await expect(service.checkIn({ bookingId: booking.id })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('handles stale reserved slot during check-in', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findUnique.mockResolvedValue(null);
    prisma.slot.findUnique.mockResolvedValue(booking.slot);
    prisma.slot.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.checkIn({ bookingId: booking.id })).rejects.toBeInstanceOf(ConflictException);
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
    prisma.parkingEvent.findUnique.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue({
      ...activeEvent,
      userId: booking.userId,
      status: ParkingEventStatus.COMPLETED,
      durationMinutes: 121,
      feeAmount: 110,
    });
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.checkOut({ parkingEventId: activeEvent.id });

    expect(prisma.parkingEvent.update).toHaveBeenCalledWith({
      where: { id: activeEvent.id },
      data: expect.objectContaining({
        status: ParkingEventStatus.COMPLETED,
        durationMinutes: 121,
        feeAmount: 110,
      }),
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

  it('charges the base fee for 60 minutes or less', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T10:30:00.000Z'));
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findUnique.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue({
      ...activeEvent,
      userId: booking.userId,
      status: ParkingEventStatus.COMPLETED,
      durationMinutes: 30,
      feeAmount: 50,
    });

    await service.checkOut({ parkingEventId: activeEvent.id });

    expect(prisma.parkingEvent.update).toHaveBeenCalledWith({
      where: { id: activeEvent.id },
      data: expect.objectContaining({
        durationMinutes: 30,
        feeAmount: 50,
      }),
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
    prisma.parkingEvent.findUnique.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue({
      ...activeEvent,
      userId: booking.userId,
      status: ParkingEventStatus.COMPLETED,
      durationMinutes: 0,
      feeAmount: 50,
    });

    await service.checkOut({ parkingEventId: activeEvent.id });

    expect(prisma.parkingEvent.update).toHaveBeenCalledWith({
      where: { id: activeEvent.id },
      data: expect.objectContaining({
        durationMinutes: 0,
        feeAmount: 50,
      }),
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
    prisma.parkingEvent.findUnique.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue({
      ...activeEvent,
      status: ParkingEventStatus.COMPLETED,
      durationMinutes: 30,
      feeAmount: 50,
    });
    paymentClientService.initiatePayment.mockResolvedValue({
      paymentInitiated: false,
      paymentError: 'Payment service unavailable',
    });

    const result = await service.checkOut({ parkingEventId: activeEvent.id });

    expect(result).toEqual({
      parkingEvent: expect.objectContaining({ status: ParkingEventStatus.COMPLETED }),
      paymentInitiated: false,
      paymentError: 'Payment service unavailable',
    });
  });

  it('sends zero payment amount when completed event has no fee amount', async () => {
    const activeEvent = {
      id: 100,
      bookingId: booking.id,
      userId: booking.userId,
      slotId: booking.slotId,
      checkInTime: new Date('2026-06-14T10:00:00.000Z'),
      status: ParkingEventStatus.ACTIVE,
    };
    prisma.parkingEvent.findUnique.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue({
      ...activeEvent,
      status: ParkingEventStatus.COMPLETED,
      durationMinutes: 0,
      feeAmount: null,
    });

    await service.checkOut({ parkingEventId: activeEvent.id });

    expect(paymentClientService.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0 }),
      undefined,
    );
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
    prisma.parkingEvent.findUnique.mockResolvedValue(activeEvent);
    prisma.parkingEvent.update.mockResolvedValue({
      ...activeEvent,
      status: ParkingEventStatus.COMPLETED,
      durationMinutes: 30,
      feeAmount: 50,
    });

    await service.checkOut({ parkingEventId: activeEvent.id }, 'Bearer security-token');

    expect(paymentClientService.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50 }),
      'Bearer security-token',
    );
  });

  it('throws when checkout parking event is missing', async () => {
    prisma.parkingEvent.findUnique.mockResolvedValue(null);

    await expect(service.checkOut({ parkingEventId: 404 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects checkout for non-active events', async () => {
    prisma.parkingEvent.findUnique.mockResolvedValue({
      id: 100,
      status: ParkingEventStatus.COMPLETED,
    });

    await expect(service.checkOut({ parkingEventId: 100 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists active parking events', async () => {
    prisma.parkingEvent.findMany.mockResolvedValue([{ id: 1, status: ParkingEventStatus.ACTIVE }]);

    const result = await service.findActive();

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith({
      where: { status: ParkingEventStatus.ACTIVE },
      orderBy: { checkInTime: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('lists current user parking history', async () => {
    prisma.parkingEvent.findMany.mockResolvedValue([{ id: 1, userId: normalUser.id }]);

    const result = await service.findHistory(normalUser);

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith({
      where: { userId: normalUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: true,
        vehicle: true,
        slot: true,
        parkingLot: true,
      },
    });
    expect(result).toHaveLength(1);
  });

  it('lists all parking events', async () => {
    prisma.parkingEvent.findMany.mockResolvedValue([{ id: 1 }]);

    const result = await service.findAll();

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith({
      orderBy: { checkInTime: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('allows admin to view any parking event', async () => {
    const event = { id: 1, userId: normalUser.id };
    prisma.parkingEvent.findUnique.mockResolvedValue(event);

    await expect(service.findOne(1, adminUser)).resolves.toBe(event);
  });

  it('allows security to view any parking event', async () => {
    const event = { id: 1, userId: normalUser.id };
    prisma.parkingEvent.findUnique.mockResolvedValue(event);

    await expect(
      service.findOne(1, { ...adminUser, role: Role.SECURITY }),
    ).resolves.toBe(event);
  });

  it('allows users to view their own parking event', async () => {
    const event = { id: 1, userId: normalUser.id };
    prisma.parkingEvent.findUnique.mockResolvedValue(event);

    await expect(service.findOne(1, normalUser)).resolves.toBe(event);
  });

  it('blocks users from viewing another user parking event', async () => {
    prisma.parkingEvent.findUnique.mockResolvedValue({
      id: 1,
      userId: 999,
    });

    await expect(service.findOne(1, normalUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when parking event is missing', async () => {
    prisma.parkingEvent.findUnique.mockResolvedValue(null);

    await expect(service.findOne(404, { ...normalUser, role: Role.USER })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
