import { ParkingEventStatus } from '@prisma/client';
import {
  presentParkingEvent,
  presentParkingEvents,
} from './parking-event.presenter';

describe('parking-event.presenter', () => {
  const event = {
    id: 1,
    organizationId: 1,
    bookingId: 10,
    userId: 2,
    vehicleId: 3,
    slotId: 4,
    parkingLotId: 5,
    checkInTime: new Date('2026-06-18T00:00:00.000Z'),
    checkOutTime: null,
    status: ParkingEventStatus.ACTIVE,
    durationMinutes: null,
    feeAmount: null,
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:00:00.000Z'),
    booking: { id: 10, bookingCode: 'BK-001' },
    vehicle: { id: 3, vehicleNumber: 'KA01AB1234' },
    slot: { id: 4, slotNumber: 'A-01' },
    parkingLot: { id: 5, name: 'Main Lot' },
    user: {
      id: 2,
      name: 'Test User',
      email: 'user@example.com',
      phone: '+910000000000',
    },
  };

  it('presents a parking event with business labels', () => {
    expect(presentParkingEvent(event)).toEqual({
      id: 1,
      organizationId: 1,
      bookingId: 10,
      userId: 2,
      vehicleId: 3,
      slotId: 4,
      parkingLotId: 5,
      checkInTime: event.checkInTime,
      checkOutTime: null,
      status: ParkingEventStatus.ACTIVE,
      durationMinutes: null,
      feeAmount: null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      bookingCode: 'BK-001',
      vehicleNumber: 'KA01AB1234',
      slotNumber: 'A-01',
      parkingLotName: 'Main Lot',
      customerName: 'Test User',
      customerEmail: 'user@example.com',
      customerPhone: '+910000000000',
    });
  });

  it('presents a list of parking events', () => {
    expect(presentParkingEvents([event])).toHaveLength(1);
  });
});