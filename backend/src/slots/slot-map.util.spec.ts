import { BookingStatus, ParkingEventStatus, SlotStatus, SlotType } from '@prisma/client';
import { adminUser, normalUser } from '../test/test-users';
import {
  buildSlotMapOccupancy,
  createEmptyLegend,
  incrementLegend,
  mapSlotToMapItem,
  normalizeSlotStatus,
} from './slot-map.util';

describe('slot-map.util', () => {
  it('normalizes unknown slot statuses', () => {
    expect(normalizeSlotStatus(SlotStatus.AVAILABLE)).toBe(SlotStatus.AVAILABLE);
    expect(normalizeSlotStatus('INVALID')).toBe('UNKNOWN');
  });

  it('builds legend counts', () => {
    const legend = createEmptyLegend();
    incrementLegend(legend, SlotStatus.AVAILABLE);
    incrementLegend(legend, SlotStatus.OCCUPIED);
    incrementLegend(legend, 'UNKNOWN');

    expect(legend).toEqual({
      AVAILABLE: 1,
      RESERVED: 0,
      OCCUPIED: 1,
      MAINTENANCE: 0,
      UNKNOWN: 1,
    });
  });

  it('sanitizes occupancy for USER role', () => {
    const occupancy = buildSlotMapOccupancy(
      {
        id: 1,
        slotNumber: 'A-01',
        slotType: SlotType.CAR,
        status: SlotStatus.OCCUPIED,
        floor: { id: 10, name: 'Ground', level: 0 },
        bookings: [],
        events: [
          {
            id: 55,
            checkInTime: new Date('2026-06-19T08:00:00.000Z'),
            bookingId: 12,
            booking: { id: 12, bookingCode: 'BK-12345' },
            vehicle: { vehicleNumber: 'TS09EA1234' },
          },
        ],
      },
      normalUser,
      true,
    );

    expect(occupancy).toEqual({
      state: 'OCCUPIED',
      bookingId: 12,
      eventId: 55,
      checkedInAt: '2026-06-19T08:00:00.000Z',
    });
    expect(occupancy?.vehicleNumber).toBeUndefined();
    expect(occupancy?.bookingCode).toBeUndefined();
  });

  it('includes operational occupancy details for admin role', () => {
    const item = mapSlotToMapItem(
      {
        id: 1,
        slotNumber: 'A-01',
        slotType: SlotType.CAR,
        status: SlotStatus.RESERVED,
        floor: { id: 10, name: 'Ground', level: 0 },
        bookings: [
          {
            id: 12,
            bookingCode: 'BK-12345',
            vehicle: { vehicleNumber: 'TS09EA1234' },
          },
        ],
        events: [],
      },
      adminUser,
      false,
    );

    expect(item.occupancy).toEqual({
      state: 'RESERVED',
      bookingId: 12,
      vehicleNumber: 'TS09EA1234',
      bookingCode: 'BK-12345',
    });
  });
});