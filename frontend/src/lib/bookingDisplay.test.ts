import { describe, expect, it } from 'vitest';
import { Booking } from '../types/booking';
import {
  getBookingCustomerLabel,
  getBookingFloorLabel,
  getBookingParkingLotLabel,
  getBookingSlotLabel,
  getBookingVehicleLabel,
} from './bookingDisplay';
import { filterBookings } from './searchFilters';

const enrichedBooking: Booking = {
  id: 1,
  userId: 2,
  vehicleId: 3,
  slotId: 4,
  parkingLotId: 5,
  status: 'CONFIRMED',
  startTime: '2026-06-18T10:00:00.000Z',
  endTime: '2026-06-18T18:00:00.000Z',
  bookingCode: 'BK-001',
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  customerName: 'Test User',
  customerEmail: 'user@example.com',
  customerPhone: '+910000000000',
  vehicleNumber: 'KA01AB1234',
  parkingLotName: 'Main Lot',
  slotNumber: 'A-01',
  floorId: 6,
  floorName: 'Level 1',
};

describe('bookingDisplay', () => {
  it('reads customer, vehicle, lot, floor, and slot labels from enriched booking fields', () => {
    expect(getBookingCustomerLabel(enrichedBooking)).toBe('Test User · user@example.com');
    expect(getBookingVehicleLabel(enrichedBooking)).toBe('KA01AB1234');
    expect(getBookingParkingLotLabel(enrichedBooking)).toBe('Main Lot');
    expect(getBookingFloorLabel(enrichedBooking)).toBe('Level 1');
    expect(getBookingSlotLabel(enrichedBooking)).toBe('A-01');
  });
});

describe('filterBookings', () => {
  it('searches enriched booking fields without reference labels', () => {
    expect(filterBookings([enrichedBooking], 'main lot')).toEqual([enrichedBooking]);
    expect(filterBookings([enrichedBooking], 'level 1')).toEqual([enrichedBooking]);
    expect(filterBookings([enrichedBooking], 'ka01ab1234')).toEqual([enrichedBooking]);
    expect(filterBookings([enrichedBooking], 'test user')).toEqual([enrichedBooking]);
    expect(filterBookings([enrichedBooking], 'confirmed')).toEqual([enrichedBooking]);
  });
});