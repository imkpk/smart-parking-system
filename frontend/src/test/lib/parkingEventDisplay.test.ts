import { describe, expect, it } from 'vitest';
import { ParkingEvent } from '@/types/parkingEvent';
import {
  getParkingEventBookingLabel,
  getParkingEventCustomerLabel,
  getParkingEventFloorLabel,
  getParkingEventParkingLotLabel,
  getParkingEventSlotLabel,
  getParkingEventVehicleLabel,
} from '@/lib/parkingEventDisplay';
import { filterParkingEvents } from '@/lib/searchFilters';

const enrichedEvent: ParkingEvent = {
  id: 10,
  bookingId: 1,
  userId: 2,
  vehicleId: 3,
  slotId: 4,
  parkingLotId: 5,
  checkInTime: '2026-06-18T10:00:00.000Z',
  checkOutTime: null,
  status: 'ACTIVE',
  durationMinutes: null,
  feeAmount: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  bookingCode: 'BK-001',
  customerName: 'Test User',
  customerEmail: 'user@example.com',
  customerPhone: '+910000000000',
  vehicleNumber: 'KA01AB1234',
  parkingLotName: 'Main Lot',
  slotNumber: 'A-01',
  floorName: 'Level 1',
};

const baseEvent: ParkingEvent = {
  id: 10,
  bookingId: 1,
  userId: 2,
  vehicleId: 3,
  slotId: 4,
  parkingLotId: 5,
  checkInTime: '2026-06-18T10:00:00.000Z',
  checkOutTime: null,
  status: 'ACTIVE',
  durationMinutes: null,
  feeAmount: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('parkingEventDisplay', () => {
  it('reads customer, vehicle, lot, floor, slot, and booking labels from enriched fields', () => {
    expect(getParkingEventBookingLabel(enrichedEvent)).toBe('BK-001');
    expect(getParkingEventCustomerLabel(enrichedEvent)).toBe('Test User · user@example.com');
    expect(getParkingEventVehicleLabel(enrichedEvent)).toBe('KA01AB1234');
    expect(getParkingEventParkingLotLabel(enrichedEvent)).toBe('Main Lot');
    expect(getParkingEventFloorLabel(enrichedEvent)).toBe('Level 1');
    expect(getParkingEventSlotLabel(enrichedEvent)).toBe('A-01');
  });

  it('falls back to id-based labels when enriched fields are missing', () => {
    expect(getParkingEventBookingLabel(baseEvent)).toBe('BK-000001');
    expect(getParkingEventCustomerLabel(baseEvent)).toBe('Customer #2');
    expect(getParkingEventVehicleLabel(baseEvent)).toBe('Vehicle #3');
    expect(getParkingEventParkingLotLabel(baseEvent)).toBe('Lot #5');
    expect(getParkingEventFloorLabel(baseEvent)).toBe('-');
    expect(getParkingEventSlotLabel(baseEvent)).toBe('Slot #4');
  });

  it('returns customer name only when email is missing', () => {
    expect(
      getParkingEventCustomerLabel({
        ...baseEvent,
        customerName: 'Test User',
      }),
    ).toBe('Test User');
  });
});

describe('filterParkingEvents', () => {
  it('searches enriched parking event fields including status labels', () => {
    expect(filterParkingEvents([enrichedEvent], 'main lot')).toEqual([enrichedEvent]);
    expect(filterParkingEvents([enrichedEvent], 'level 1')).toEqual([enrichedEvent]);
    expect(filterParkingEvents([enrichedEvent], 'ka01ab1234')).toEqual([enrichedEvent]);
    expect(filterParkingEvents([enrichedEvent], 'test user')).toEqual([enrichedEvent]);
    expect(filterParkingEvents([enrichedEvent], 'active')).toEqual([enrichedEvent]);
    expect(filterParkingEvents([enrichedEvent], 'bk-001')).toEqual([enrichedEvent]);
  });
});