/// <reference types="jest" />

import { BookingStatus, ParkingEventStatus, SlotStatus } from '@prisma/client';
import { AccessPolicyService } from './common/access-policy.service';
import { DashboardService } from './dashboard/dashboard.service';
import { DEFAULT_ORGANIZATION_ID } from './organizations/organizations.constants';
import { ParkingLotValidationService } from './parking-lots/parking-lot-validation.service';
import { SlotLifecycleService } from './slots/slot-lifecycle.service';
import { securityUser, tenantAdminUser, normalUser } from './test/test-users';
import {
  parkingEventListInclude,
  presentParkingEvent,
} from './parking-events/parking-event.presenter';
import { ParkingEventsService } from './parking-events/parking-events.service';

describe('Check-in dashboard flow acceptance', () => {
  const accessPolicy = new AccessPolicyService();

  const booking = {
    id: 1,
    bookingCode: 'BK-FLOW',
    organizationId: DEFAULT_ORGANIZATION_ID,
    userId: normalUser.id,
    vehicleId: 10,
    slotId: 20,
    parkingLotId: 30,
    status: BookingStatus.CONFIRMED,
    slot: { id: 20, status: SlotStatus.RESERVED },
  };

  const createParkingEventsService = (prisma: Record<string, unknown>) => {
    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    const slotLifecycleService = new SlotLifecycleService(
      prisma as never,
      parkingLotValidationService,
    );

    return new ParkingEventsService(
      prisma as never,
      accessPolicy,
      { initiatePayment: jest.fn() } as never,
      slotLifecycleService,
    );
  };

  const createDashboardService = (prisma: Record<string, unknown>) =>
    new DashboardService(
      prisma as never,
      new ParkingLotValidationService(prisma as never),
      accessPolicy,
    );

  it('check-in creates an active parking event and occupies the reserved slot', async () => {
    const parkingEvent = {
      id: 100,
      organizationId: booking.organizationId,
      bookingId: booking.id,
      userId: booking.userId,
      vehicleId: booking.vehicleId,
      slotId: booking.slotId,
      parkingLotId: booking.parkingLotId,
      checkInTime: new Date('2026-06-20T10:00:00.000Z'),
      checkOutTime: null,
      status: ParkingEventStatus.ACTIVE,
      durationMinutes: null,
      feeAmount: null,
      createdAt: new Date('2026-06-20T10:00:00.000Z'),
      updatedAt: new Date('2026-06-20T10:00:00.000Z'),
      booking: { id: booking.id, bookingCode: booking.bookingCode },
      vehicle: { id: booking.vehicleId, vehicleNumber: 'KA01AB1234' },
      slot: {
        id: booking.slotId,
        slotNumber: 'A-01',
        floor: { id: 1, name: 'Ground' },
      },
      parkingLot: { id: booking.parkingLotId, name: 'Main Lot' },
      user: {
        id: booking.userId,
        name: normalUser.name,
        email: normalUser.email,
        phone: normalUser.phone,
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      booking: {
        findFirst: jest.fn().mockResolvedValue(booking),
        update: jest.fn(),
      },
      parkingEvent: {
        create: jest.fn().mockResolvedValue(parkingEvent),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      slot: {
        findUnique: jest.fn().mockResolvedValue(booking.slot),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const parkingEventsService = createParkingEventsService(prisma);
    const result = await parkingEventsService.checkIn(
      { bookingId: booking.id },
      securityUser,
    );

    expect(prisma.parkingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: booking.organizationId,
        bookingId: booking.id,
        userId: booking.userId,
        vehicleId: booking.vehicleId,
        slotId: booking.slotId,
        parkingLotId: booking.parkingLotId,
        status: ParkingEventStatus.ACTIVE,
        checkInTime: expect.any(Date),
      }),
      include: parkingEventListInclude,
    });
    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: booking.slotId, status: SlotStatus.RESERVED },
      data: { status: SlotStatus.OCCUPIED },
    });
    expect(result).toEqual(presentParkingEvent(parkingEvent));
  });

  it('tenant, security, and user dashboards read active sessions from parking events', async () => {
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Default Organization' }),
      },
      booking: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      parkingEvent: {
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn().mockResolvedValue({ _sum: { feeAmount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      parkingLot: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      slot: {
        groupBy: jest.fn().mockResolvedValue([
          { status: SlotStatus.OCCUPIED, _count: { _all: 1 } },
        ]),
      },
      vehicle: {
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const dashboardService = createDashboardService(prisma);

    const tenantMetrics = await dashboardService.getOperatorMetrics(tenantAdminUser);
    const securityMetrics = await dashboardService.getOperatorMetrics(securityUser);
    const userMetrics = await dashboardService.getOperatorMetrics(normalUser);

    expect(tenantMetrics.parkingEvents?.active).toBe(1);
    expect(tenantMetrics.parkingEvents?.checkInsToday).toBe(1);
    expect(securityMetrics.parkingEvents?.active).toBe(1);
    expect(securityMetrics.parkingEvents?.checkInsToday).toBe(1);
    expect(userMetrics.userOverview?.activeParkingEvents).toBe(1);

    expect(prisma.parkingEvent.count).toHaveBeenCalledWith({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        status: ParkingEventStatus.ACTIVE,
      },
    });
    expect(prisma.parkingEvent.count).toHaveBeenCalledWith({
      where: {
        userId: normalUser.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
        status: ParkingEventStatus.ACTIVE,
      },
    });
  });
});