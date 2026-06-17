import { BookingStatus } from '@prisma/client';
import { presentBooking, presentBookings } from './booking.presenter';

describe('booking.presenter', () => {
  const booking = {
    id: 1,
    organizationId: 1,
    bookingCode: 'BK-001',
    userId: 2,
    vehicleId: 3,
    slotId: 4,
    parkingLotId: 5,
    status: BookingStatus.CONFIRMED,
    startTime: new Date('2026-06-18T10:00:00.000Z'),
    endTime: new Date('2026-06-18T18:00:00.000Z'),
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:00:00.000Z'),
    user: {
      id: 2,
      name: 'Test User',
      email: 'user@example.com',
      phone: '+910000000000',
    },
    vehicle: { id: 3, vehicleNumber: 'KA01AB1234' },
    parkingLot: { id: 5, name: 'Main Lot' },
    slot: {
      id: 4,
      slotNumber: 'A-01',
      floor: { id: 6, name: 'Level 1' },
    },
  };

  it('presents a booking with business labels', () => {
    expect(presentBooking(booking)).toEqual({
      id: 1,
      organizationId: 1,
      bookingCode: 'BK-001',
      userId: 2,
      vehicleId: 3,
      slotId: 4,
      parkingLotId: 5,
      status: BookingStatus.CONFIRMED,
      startTime: booking.startTime,
      endTime: booking.endTime,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      customerName: 'Test User',
      customerEmail: 'user@example.com',
      customerPhone: '+910000000000',
      vehicleNumber: 'KA01AB1234',
      parkingLotName: 'Main Lot',
      slotNumber: 'A-01',
      floorId: 6,
      floorName: 'Level 1',
    });
  });

  it('presents a list of bookings', () => {
    expect(presentBookings([booking])).toHaveLength(1);
  });
});