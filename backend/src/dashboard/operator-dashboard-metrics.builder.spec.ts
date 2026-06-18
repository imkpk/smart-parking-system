import { BookingStatus, ParkingEventStatus } from '@prisma/client';
import {
  buildBookingVolumeSummary,
  buildLotUtilizationItem,
  buildOccupancySummary,
  buildRevenueSummary,
  mapRecentActivity,
} from './operator-dashboard-metrics.builder';

describe('operator-dashboard-metrics.builder', () => {
  it('builds occupancy summary with utilization percent', () => {
    expect(
      buildOccupancySummary({
        totalSlots: 10,
        availableSlots: 4,
        occupiedSlots: 3,
        reservedSlots: 2,
        maintenanceSlots: 1,
      }),
    ).toEqual({
      totalSlots: 10,
      availableSlots: 4,
      occupiedSlots: 3,
      reservedSlots: 2,
      maintenanceSlots: 1,
      utilizationPercent: 50,
    });
  });

  it('builds lot utilization item', () => {
    expect(buildLotUtilizationItem(1, 'Lot A', { totalSlots: 8, availableSlots: 3, occupiedSlots: 5 })).toEqual({
      parkingLotId: 1,
      parkingLotName: 'Lot A',
      totalSlots: 8,
      availableSlots: 3,
      occupiedSlots: 5,
      utilizationPercent: 63,
    });
  });

  it('builds booking volume summary from status counts', () => {
    expect(
      buildBookingVolumeSummary(20, 4, 9, [
        { status: BookingStatus.PENDING, count: 2 },
        { status: BookingStatus.CONFIRMED, count: 15 },
        { status: BookingStatus.CANCELLED, count: 3 },
      ]),
    ).toEqual({
      total: 20,
      today: 4,
      thisWeek: 9,
      pending: 2,
      confirmed: 15,
      cancelled: 3,
    });
  });

  it('builds revenue summary in INR', () => {
    expect(buildRevenueSummary(120, 640, 2400)).toEqual({
      todayCollectedFees: 120,
      weekCollectedFees: 640,
      monthCollectedFees: 2400,
      currency: 'INR',
    });
  });

  it('maps recent activity with check-in and check-out labels', () => {
    const checkInTime = new Date('2026-06-18T08:00:00.000Z');
    const checkOutTime = new Date('2026-06-18T10:00:00.000Z');

    expect(
      mapRecentActivity([
        {
          id: 1,
          status: ParkingEventStatus.ACTIVE,
          checkInTime,
          checkOutTime: null,
          vehicle: { vehicleNumber: 'TS09EA1234' },
          slot: { slotNumber: 'A-01' },
          parkingLot: { name: 'Lot A' },
        },
        {
          id: 2,
          status: ParkingEventStatus.COMPLETED,
          checkInTime,
          checkOutTime,
          vehicle: { vehicleNumber: 'TS09EA5678' },
          slot: { slotNumber: 'B-02' },
          parkingLot: { name: 'Lot B' },
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        parkingEventId: 1,
        activityType: 'CHECK_IN',
        vehicleNumber: 'TS09EA1234',
      }),
      expect.objectContaining({
        parkingEventId: 2,
        activityType: 'CHECK_OUT',
        vehicleNumber: 'TS09EA5678',
      }),
    ]);
  });
});