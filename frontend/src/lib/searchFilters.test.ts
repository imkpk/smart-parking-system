import { describe, expect, it } from 'vitest';
import { createPayment } from '../test/paymentFixtures';
import {
  filterBookings,
  filterFloors,
  filterParkingEvents,
  filterParkingLots,
  filterPayments,
  filterSlots,
  filterVehicles,
  getBookingSearchValues,
  getFloorSearchValues,
  getParkingEventSearchValues,
  getParkingLotSearchValues,
  getPaymentSearchValues,
  getSlotSearchValues,
  getVehicleSearchValues,
  matchesSearch,
  ReferenceLabels,
} from './searchFilters';

const labels: ReferenceLabels = {
  getBookingCode: (bookingId) => (bookingId === 1 ? 'BK-001' : undefined),
  getCustomerLabel: (userId) => `Customer #${userId}`,
  getParkingLotLabel: (parkingLotId) => `Lot #${parkingLotId}`,
  getSlotLabel: (slotId) => `Slot #${slotId}`,
  getVehicleLabel: (vehicleId) => `Vehicle #${vehicleId}`,
  getVehicleLabelForBooking: (bookingId) => (bookingId === 1 ? 'KA01AB1234' : 'Vehicle #0'),
};

const booking = {
  id: 1,
  userId: 2,
  vehicleId: 3,
  slotId: 4,
  parkingLotId: 5,
  status: 'CONFIRMED' as const,
  startTime: '2026-06-18T10:00:00.000Z',
  endTime: '2026-06-18T18:00:00.000Z',
  bookingCode: 'BK-001',
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  customerName: 'Test User',
  customerEmail: 'user@example.com',
  vehicleNumber: 'KA01AB1234',
  parkingLotName: 'Main Lot',
  slotNumber: 'A-01',
  floorName: 'Level 1',
};

const parkingEvent = {
  id: 10,
  bookingId: 1,
  userId: 2,
  vehicleId: 3,
  slotId: 4,
  parkingLotId: 5,
  checkInTime: '2026-06-18T10:00:00.000Z',
  checkOutTime: null,
  status: 'ACTIVE' as const,
  durationMinutes: null,
  feeAmount: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  bookingCode: 'BK-001',
  customerName: 'Test User',
  customerEmail: 'user@example.com',
  vehicleNumber: 'KA01AB1234',
  parkingLotName: 'Main Lot',
  slotNumber: 'A-01',
  floorName: 'Level 1',
};

const payment = createPayment({
  id: 10,
  bookingId: 1,
  userId: 2,
  parkingEventId: 10,
  status: 'INITIATED',
  paymentMethod: 'UPI',
  provider: 'RAZORPAY',
  gatewayOrderId: 'order_test_123',
  providerReference: 'ref-123',
  failureReason: null,
});

const vehicle = {
  id: 3,
  userId: 2,
  vehicleNumber: 'KA01AB1234',
  vehicleType: 'CAR' as const,
  brand: 'Toyota',
  model: 'Camry',
  color: 'White',
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

const parkingLot = {
  id: 5,
  name: 'Main Lot',
  type: 'MALL' as const,
  address: '123 Street',
  city: 'Bengaluru',
  state: 'KA',
  pincode: '560001',
  isActive: true,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

const floor = {
  id: 6,
  name: 'Level 1',
  level: 1,
  parkingLotId: 5,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

const slot = {
  id: 4,
  slotNumber: 'A-01',
  slotType: 'CAR' as const,
  status: 'AVAILABLE' as const,
  floorId: 6,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('matchesSearch', () => {
  it('returns true for empty or whitespace query', () => {
    expect(matchesSearch('', ['anything'])).toBe(true);
    expect(matchesSearch('   ', ['anything'])).toBe(true);
  });

  it('matches case-insensitively against any value', () => {
    expect(matchesSearch('main', ['Other', 'Main Lot'])).toBe(true);
    expect(matchesSearch('BK-000001', [1, 'BK-000001'])).toBe(true);
  });

  it('treats null and undefined values as empty strings', () => {
    expect(matchesSearch('test', [null, undefined, 'no-match'])).toBe(false);
    expect(matchesSearch('hello', [null, 'hello world'])).toBe(true);
  });

  it('returns false when no values match', () => {
    expect(matchesSearch('missing', ['alpha', 'beta'])).toBe(false);
  });
});

describe('payment search helpers', () => {
  it('getPaymentSearchValues includes formatted and reference values', () => {
    const values = getPaymentSearchValues(payment, labels);

    expect(values).toEqual(
      expect.arrayContaining([
        'PAY-000010',
        10,
        'BK-000001',
        1,
        'BK-001',
        'Customer #2',
        'KA01AB1234',
        'SES-000010',
        10,
        'INITIATED',
        'Initiated',
        'UPI',
        'Upi',
        'RAZORPAY',
        'Razorpay',
        'order_test_123',
        'ref-123',
        'INR',
        null,
      ]),
    );
  });

  it('filterPayments filters by query', () => {
    expect(filterPayments([payment], 'order_test', labels)).toEqual([payment]);
    expect(filterPayments([payment], 'missing', labels)).toEqual([]);
    expect(filterPayments([payment], '', labels)).toEqual([payment]);
  });
});

describe('parking event search helpers', () => {
  it('getParkingEventSearchValues includes enriched fields', () => {
    const values = getParkingEventSearchValues(parkingEvent);

    expect(values).toEqual(
      expect.arrayContaining([
        'SES-000010',
        10,
        'BK-000001',
        1,
        'BK-001',
        'Test User',
        'user@example.com',
        'KA01AB1234',
        'Main Lot',
        'Level 1',
        'A-01',
        'ACTIVE',
        'Active',
      ]),
    );
  });

  it('filterParkingEvents filters by query', () => {
    expect(filterParkingEvents([parkingEvent], 'level 1')).toEqual([parkingEvent]);
    expect(filterParkingEvents([parkingEvent], 'nomatch')).toEqual([]);
  });
});

describe('booking search helpers', () => {
  it('getBookingSearchValues includes enriched fields', () => {
    const values = getBookingSearchValues(booking);

    expect(values).toEqual(
      expect.arrayContaining([
        'BK-000001',
        1,
        'BK-001',
        'Test User',
        'user@example.com',
        'KA01AB1234',
        'Main Lot',
        'Level 1',
        'A-01',
        'CONFIRMED',
        'Confirmed',
      ]),
    );
  });

  it('filterBookings filters by query', () => {
    expect(filterBookings([booking], 'confirmed')).toEqual([booking]);
    expect(filterBookings([booking], 'missing')).toEqual([]);
  });
});

describe('vehicle search helpers', () => {
  it('getVehicleSearchValues excludes owner when includeOwner is false', () => {
    const values = getVehicleSearchValues(vehicle, labels, false);

    expect(values).toEqual([
      'KA01AB1234',
      'CAR',
      'Car',
      'Toyota',
      'Camry',
      'White',
    ]);
    expect(values).not.toContain('Customer #2');
  });

  it('getVehicleSearchValues includes owner when includeOwner is true', () => {
    const values = getVehicleSearchValues(vehicle, labels, true);

    expect(values).toContain('Customer #2');
  });

  it('filterVehicles filters by query with owner toggle', () => {
    expect(filterVehicles([vehicle], 'toyota', labels, false)).toEqual([vehicle]);
    expect(filterVehicles([vehicle], 'customer #2', labels, false)).toEqual([]);
    expect(filterVehicles([vehicle], 'customer #2', labels, true)).toEqual([vehicle]);
  });
});

describe('parking lot search helpers', () => {
  it('getParkingLotSearchValues includes active/inactive label', () => {
    expect(getParkingLotSearchValues(parkingLot)).toEqual(
      expect.arrayContaining(['Main Lot', 'MALL', 'Mall', '123 Street', 'Bengaluru', 'KA', '560001', 'active']),
    );

    const inactiveLot = { ...parkingLot, isActive: false };
    expect(getParkingLotSearchValues(inactiveLot)).toContain('inactive');
  });

  it('filterParkingLots filters by query', () => {
    expect(filterParkingLots([parkingLot], 'bengaluru')).toEqual([parkingLot]);
    expect(filterParkingLots([parkingLot], 'inactive')).toEqual([]);
  });
});

describe('floor search helpers', () => {
  it('getFloorSearchValues includes parking lot name', () => {
    expect(getFloorSearchValues(floor, 'Main Lot')).toEqual(['Level 1', 1, 'Main Lot']);
  });

  it('filterFloors filters by query', () => {
    expect(filterFloors([floor], 'level 1', 'Main Lot')).toEqual([floor]);
    expect(filterFloors([floor], 'main lot', 'Main Lot')).toEqual([floor]);
    expect(filterFloors([floor], 'missing', 'Main Lot')).toEqual([]);
  });
});

describe('slot search helpers', () => {
  it('getSlotSearchValues includes floor and lot names', () => {
    expect(getSlotSearchValues(slot, 'Level 1', 'Main Lot')).toEqual([
      'A-01',
      'Level 1',
      'Main Lot',
      'CAR',
      'Car',
      'AVAILABLE',
      'Available',
    ]);
  });

  it('filterSlots uses floor name map with empty fallback', () => {
    const floorNameById = new Map([[6, 'Level 1']]);

    expect(filterSlots([slot], 'available', floorNameById, 'Main Lot')).toEqual([slot]);

    const unknownFloorSlot = { ...slot, floorId: 99 };
    expect(
      filterSlots([unknownFloorSlot], 'main lot', floorNameById, 'Main Lot'),
    ).toEqual([unknownFloorSlot]);
    expect(
      filterSlots([unknownFloorSlot], 'level 1', floorNameById, 'Main Lot'),
    ).toEqual([]);
  });
});