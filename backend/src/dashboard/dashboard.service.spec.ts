import { NotFoundException } from '@nestjs/common';
import { ParkingEventStatus, SlotStatus } from '@prisma/client';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    booking: { count: jest.Mock; findMany: jest.Mock };
    floor: { count: jest.Mock };
    parkingEvent: { count: jest.Mock; findMany: jest.Mock };
    parkingLot: { count: jest.Mock; findFirst: jest.Mock };
    slot: { count: jest.Mock; groupBy: jest.Mock };
    user: { count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      booking: { count: jest.fn(), findMany: jest.fn() },
      floor: { count: jest.fn() },
      parkingEvent: { count: jest.fn(), findMany: jest.fn() },
      parkingLot: { count: jest.fn(), findFirst: jest.fn() },
      slot: { count: jest.fn(), groupBy: jest.fn() },
      user: { count: jest.fn() },
    };

    service = new DashboardService(prisma as never);
  });

  it('returns admin summary', async () => {
    prisma.user.count.mockResolvedValue(5);
    prisma.parkingLot.count.mockResolvedValue(2);
    prisma.slot.count.mockResolvedValue(10);
    prisma.booking.count.mockResolvedValue(8);
    prisma.parkingEvent.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.AVAILABLE, _count: { _all: 4 } },
      { status: SlotStatus.OCCUPIED, _count: { _all: 3 } },
      { status: SlotStatus.RESERVED, _count: { _all: 2 } },
      { status: SlotStatus.MAINTENANCE, _count: { _all: 1 } },
    ]);

    await expect(service.getAdminSummary()).resolves.toEqual({
      totalUsers: 5,
      totalParkingLots: 2,
      totalSlots: 10,
      availableSlots: 4,
      occupiedSlots: 3,
      reservedSlots: 2,
      maintenanceSlots: 1,
      totalBookings: 8,
      activeParkingEvents: 3,
      completedParkingEvents: 4,
    });
    expect(prisma.parkingEvent.count).toHaveBeenCalledWith({
      where: { status: ParkingEventStatus.ACTIVE },
    });
    expect(prisma.parkingEvent.count).toHaveBeenCalledWith({
      where: { status: ParkingEventStatus.COMPLETED },
    });
  });

  it('returns parking lot summary', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, name: 'Lot A' });
    prisma.floor.count.mockResolvedValue(2);
    prisma.slot.count.mockResolvedValue(10);
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.AVAILABLE, _count: { _all: 7 } },
      { status: SlotStatus.OCCUPIED, _count: { _all: 3 } },
    ]);
    prisma.booking.count.mockResolvedValue(4);
    prisma.parkingEvent.count.mockResolvedValue(1);

    const result = await service.getParkingLotSummary(1);

    expect(result).toEqual({
      parkingLotId: 1,
      parkingLotName: 'Lot A',
      totalFloors: 2,
      totalSlots: 10,
      availableSlots: 7,
      occupiedSlots: 3,
      reservedSlots: 0,
      maintenanceSlots: 0,
      todayBookings: 4,
      activeEvents: 1,
    });
    expect(prisma.parkingLot.findFirst).toHaveBeenCalledWith({
      where: { id: 1, isActive: true },
      select: { id: true, name: true },
    });
    expect(prisma.slot.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { floor: { parkingLotId: 1 } },
      _count: { _all: true },
    });
  });

  it('throws when parking lot summary target is missing', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.getParkingLotSummary(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns recent events mapped with vehicle, slot, and parking lot names', async () => {
    const checkInTime = new Date('2026-06-14T10:00:00.000Z');
    const checkOutTime = new Date('2026-06-14T12:00:00.000Z');
    prisma.parkingEvent.findMany.mockResolvedValue([
      {
        id: 1,
        bookingId: 2,
        status: ParkingEventStatus.COMPLETED,
        checkInTime,
        checkOutTime,
        feeAmount: 80,
        vehicle: { vehicleNumber: 'TS09EA1234' },
        slot: { slotNumber: 'A-01' },
        parkingLot: { name: 'Lot A' },
      },
    ]);

    await expect(service.getRecentEvents()).resolves.toEqual([
      {
        parkingEventId: 1,
        bookingId: 2,
        vehicleNumber: 'TS09EA1234',
        slotNumber: 'A-01',
        parkingLotName: 'Lot A',
        status: ParkingEventStatus.COMPLETED,
        checkInTime,
        checkOutTime,
        feeAmount: 80,
      },
    ]);
    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith({
      orderBy: { checkInTime: 'desc' },
      take: 10,
      include: {
        vehicle: true,
        slot: true,
        parkingLot: true,
      },
    });
  });

  it('returns today bookings with related user, vehicle, slot, and parking lot', async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 1 }]);

    await expect(service.getTodayBookings()).resolves.toEqual([{ id: 1 }]);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        startTime: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      },
      orderBy: { startTime: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        vehicle: true,
        slot: true,
        parkingLot: true,
      },
    });
  });

  it('returns global slot status summary with zero-filled missing statuses', async () => {
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.RESERVED, _count: { _all: 2 } },
    ]);

    await expect(service.getSlotStatusSummary()).resolves.toEqual({
      availableSlots: 0,
      occupiedSlots: 0,
      reservedSlots: 2,
      maintenanceSlots: 0,
    });
    expect(prisma.slot.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: undefined,
      _count: { _all: true },
    });
  });
});
