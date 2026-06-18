import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
  },
}));

import {
  cancelBooking,
  createBooking,
  getAvailableSlotsForBooking,
  getBooking,
  getBookings,
  getMyBookings,
} from '@/api/bookingsApi';

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

describe('bookingsApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('getAvailableSlotsForBooking fetches slots by lot and vehicle type', async () => {
    getMock.mockResolvedValue({ data: [slot] });

    const result = await getAvailableSlotsForBooking(5, 'CAR');

    expect(getMock).toHaveBeenCalledWith('/parking-lots/5/available-slots', {
      params: { vehicleType: 'CAR' },
    });
    expect(result).toEqual([slot]);
  });

  it('createBooking posts booking payload', async () => {
    postMock.mockResolvedValue({ data: booking });
    const payload = {
      vehicleId: 3,
      slotId: 4,
      startTime: '2026-06-18T10:00:00.000Z',
    };

    const result = await createBooking(payload);

    expect(postMock).toHaveBeenCalledWith('/bookings', payload);
    expect(result).toEqual(booking);
  });

  it('getMyBookings fetches current user bookings', async () => {
    getMock.mockResolvedValue({ data: [booking] });

    const result = await getMyBookings();

    expect(getMock).toHaveBeenCalledWith('/bookings/my');
    expect(result).toEqual([booking]);
  });

  it('getBookings fetches all bookings', async () => {
    getMock.mockResolvedValue({ data: [booking] });

    const result = await getBookings();

    expect(getMock).toHaveBeenCalledWith('/bookings');
    expect(result).toEqual([booking]);
  });

  it('getBooking fetches booking by id', async () => {
    getMock.mockResolvedValue({ data: booking });

    const result = await getBooking(1);

    expect(getMock).toHaveBeenCalledWith('/bookings/1');
    expect(result).toEqual(booking);
  });

  it('cancelBooking posts cancel request', async () => {
    postMock.mockResolvedValue({ data: { ...booking, status: 'CANCELLED' } });

    const result = await cancelBooking(1);

    expect(postMock).toHaveBeenCalledWith('/bookings/1/cancel');
    expect(result.status).toBe('CANCELLED');
  });
});