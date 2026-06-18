import { NotFoundException } from '@nestjs/common';
import { BookingStatus, ParkingEventStatus, Role, SlotStatus } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import {
  adminUser,
  normalUser,
  securityUser,
  superAdminUser,
  tenantAdminUser,
} from '../test/test-users';
import { org2 } from '../test/test-tenant-fixtures';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    booking: { count: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
    floor: { count: jest.Mock };
    organization: { count: jest.Mock; findUnique: jest.Mock };
    parkingEvent: {
      aggregate: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    parkingLot: { count: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock };
    slot: { count: jest.Mock; groupBy: jest.Mock };
    user: { count: jest.Mock };
    vehicle: { count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      booking: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
      floor: { count: jest.fn() },
      organization: { count: jest.fn(), findUnique: jest.fn() },
      parkingEvent: { aggregate: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      parkingLot: { count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
      slot: { count: jest.fn(), groupBy: jest.fn() },
      user: { count: jest.fn() },
      vehicle: { count: jest.fn() },
    };

    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    service = new DashboardService(
      prisma as never,
      parkingLotValidationService,
      new AccessPolicyService(),
    );
  });

  it('returns admin summary scoped to organization', async () => {
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

    await expect(service.getAdminSummary(adminUser)).resolves.toEqual({
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
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(prisma.parkingLot.count).toHaveBeenCalledWith({
      where: { isActive: true, organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(prisma.slot.count).toHaveBeenCalledWith({
      where: {
        floor: {
          parkingLot: { organizationId: DEFAULT_ORGANIZATION_ID },
        },
      },
    });
    expect(prisma.booking.count).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(prisma.parkingEvent.count).toHaveBeenCalledWith({
      where: { status: ParkingEventStatus.ACTIVE, organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(prisma.parkingEvent.count).toHaveBeenCalledWith({
      where: { status: ParkingEventStatus.COMPLETED, organizationId: DEFAULT_ORGANIZATION_ID },
    });
  });

  it('uses a different organization scope for another tenant admin', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.parkingLot.count.mockResolvedValue(1);
    prisma.slot.count.mockResolvedValue(2);
    prisma.booking.count.mockResolvedValue(1);
    prisma.parkingEvent.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.slot.groupBy.mockResolvedValue([]);

    await service.getAdminSummary(org2.adminUser);

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { organizationId: org2.organizationId },
    });
  });

  it('returns parking lot summary scoped to organization', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, name: 'Lot A' });
    prisma.floor.count.mockResolvedValue(2);
    prisma.slot.count.mockResolvedValue(10);
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.AVAILABLE, _count: { _all: 7 } },
      { status: SlotStatus.OCCUPIED, _count: { _all: 3 } },
    ]);
    prisma.booking.count.mockResolvedValue(4);
    prisma.parkingEvent.count.mockResolvedValue(1);

    const result = await service.getParkingLotSummary(1, adminUser);

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
      where: { id: 1, isActive: true, organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(prisma.slot.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: {
        floor: {
          parkingLotId: 1,
          parkingLot: { organizationId: DEFAULT_ORGANIZATION_ID },
        },
      },
      _count: { _all: true },
    });
  });

  it('throws when parking lot summary target is missing', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.getParkingLotSummary(404, adminUser)).rejects.toBeInstanceOf(
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

    await expect(service.getRecentEvents(adminUser)).resolves.toEqual([
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
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
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

    await expect(service.getTodayBookings(adminUser)).resolves.toEqual([{ id: 1 }]);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
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

  it('returns tenant operator metrics for admin users', async () => {
    prisma.organization.findUnique.mockResolvedValue({ name: 'Default Organization' });
    prisma.booking.count.mockResolvedValueOnce(20).mockResolvedValueOnce(4).mockResolvedValueOnce(9);
    prisma.booking.groupBy.mockResolvedValue([
      { status: BookingStatus.CONFIRMED, _count: { _all: 15 } },
      { status: BookingStatus.PENDING, _count: { _all: 2 } },
    ]);
    prisma.parkingEvent.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4);
    prisma.parkingEvent.aggregate.mockResolvedValue({ _sum: { feeAmount: 120 } });
    prisma.parkingEvent.findMany.mockResolvedValue([]);
    prisma.parkingLot.findMany.mockResolvedValue([{ id: 1, name: 'Lot A' }]);
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.AVAILABLE, _count: { _all: 4 } },
      { status: SlotStatus.OCCUPIED, _count: { _all: 3 } },
      { status: SlotStatus.RESERVED, _count: { _all: 2 } },
      { status: SlotStatus.MAINTENANCE, _count: { _all: 1 } },
    ]);

    const result = await service.getOperatorMetrics(adminUser);

    expect(result.scope).toBe('TENANT');
    expect(result.role).toBe(Role.ADMIN);
    expect(result.organizationName).toBe('Default Organization');
    expect(result.occupancy?.utilizationPercent).toBe(50);
    expect(result.occupancy?.totalSlots).toBe(10);
    expect(result.bookings?.total).toBe(20);
    expect(result.revenue?.todayCollectedFees).toBe(120);
    expect(result.lotUtilization).toHaveLength(1);
  });

  it('returns security operator metrics without revenue', async () => {
    prisma.organization.findUnique.mockResolvedValue({ name: 'Default Organization' });
    prisma.booking.count.mockResolvedValue(6);
    prisma.parkingEvent.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prisma.parkingEvent.findMany.mockResolvedValue([]);
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.OCCUPIED, _count: { _all: 2 } },
    ]);

    const result = await service.getOperatorMetrics(securityUser);

    expect(result.scope).toBe('TENANT');
    expect(result.role).toBe(Role.SECURITY);
    expect(result.revenue).toBeNull();
    expect(result.bookings?.today).toBe(6);
  });

  it('returns user operator metrics scoped to the current user', async () => {
    prisma.organization.findUnique.mockResolvedValue({ name: 'Default Organization' });
    prisma.vehicle.count.mockResolvedValue(2);
    prisma.booking.count.mockResolvedValue(1);
    prisma.parkingEvent.count.mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    prisma.parkingEvent.findMany.mockResolvedValue([]);

    const result = await service.getOperatorMetrics(normalUser);

    expect(result.scope).toBe('USER');
    expect(result.userOverview).toEqual({
      totalVehicles: 2,
      upcomingBookings: 1,
      activeParkingEvents: 1,
      completedParkingEvents: 4,
    });
    expect(result.occupancy).toBeNull();
  });

  it('returns platform operator metrics for super admin without organization context', async () => {
    prisma.organization.count.mockResolvedValue(3);
    prisma.user.count.mockResolvedValue(40);
    prisma.parkingLot.count.mockResolvedValue(8);
    prisma.slot.count.mockResolvedValue(120);
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.AVAILABLE, _count: { _all: 70 } },
      { status: SlotStatus.OCCUPIED, _count: { _all: 40 } },
    ]);
    prisma.parkingEvent.count.mockResolvedValueOnce(6).mockResolvedValueOnce(30);
    prisma.booking.count.mockResolvedValueOnce(100).mockResolvedValueOnce(8);

    const result = await service.getOperatorMetrics(superAdminUser);

    expect(result.scope).toBe('PLATFORM');
    expect(result.platformOverview).toEqual({
      totalOrganizations: 3,
      totalUsers: 40,
      totalParkingLots: 8,
      totalSlots: 120,
    });
    expect(result.organizationName).toBeNull();
  });

  it('returns tenant operator metrics for tenant admin', async () => {
    prisma.organization.findUnique.mockResolvedValue({ name: 'Default Organization' });
    prisma.booking.count.mockResolvedValue(0);
    prisma.booking.groupBy.mockResolvedValue([]);
    prisma.parkingEvent.count.mockResolvedValue(0);
    prisma.parkingEvent.aggregate.mockResolvedValue({ _sum: { feeAmount: null } });
    prisma.parkingEvent.findMany.mockResolvedValue([]);
    prisma.parkingLot.findMany.mockResolvedValue([]);
    prisma.slot.groupBy.mockResolvedValue([]);

    const result = await service.getOperatorMetrics(tenantAdminUser);

    expect(result.scope).toBe('TENANT');
    expect(result.role).toBe(Role.TENANT_ADMIN);
  });

  it('returns global slot status summary with zero-filled missing statuses', async () => {
    prisma.slot.groupBy.mockResolvedValue([
      { status: SlotStatus.RESERVED, _count: { _all: 2 } },
    ]);

    await expect(service.getSlotStatusSummary(adminUser)).resolves.toEqual({
      availableSlots: 0,
      occupiedSlots: 0,
      reservedSlots: 2,
      maintenanceSlots: 0,
    });
    expect(prisma.slot.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: {
        floor: {
          parkingLot: { organizationId: DEFAULT_ORGANIZATION_ID },
        },
      },
      _count: { _all: true },
    });
  });
});