import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('./client', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
  },
}));

import {
  checkInParkingEvent,
  checkOutParkingEvent,
  getActiveParkingEvents,
  getParkingEvent,
  getParkingEventHistory,
  getParkingEvents,
} from './parkingEventsApi';

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
};

const checkOutResult = {
  parkingEvent: { ...parkingEvent, status: 'COMPLETED' as const },
  paymentInitiated: true,
};

describe('parkingEventsApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('checkInParkingEvent posts check-in payload', async () => {
    postMock.mockResolvedValue({ data: parkingEvent });
    const payload = { bookingCode: 'BK-001' };

    const result = await checkInParkingEvent(payload);

    expect(postMock).toHaveBeenCalledWith('/parking-events/check-in', payload);
    expect(result).toEqual(parkingEvent);
  });

  it('checkOutParkingEvent posts check-out payload', async () => {
    postMock.mockResolvedValue({ data: checkOutResult });
    const payload = { parkingEventId: 10 };

    const result = await checkOutParkingEvent(payload);

    expect(postMock).toHaveBeenCalledWith('/parking-events/check-out', payload);
    expect(result).toEqual(checkOutResult);
  });

  it('getActiveParkingEvents fetches active events', async () => {
    getMock.mockResolvedValue({ data: [parkingEvent] });

    const result = await getActiveParkingEvents();

    expect(getMock).toHaveBeenCalledWith('/parking-events/active');
    expect(result).toEqual([parkingEvent]);
  });

  it('getParkingEventHistory fetches event history', async () => {
    getMock.mockResolvedValue({ data: [parkingEvent] });

    const result = await getParkingEventHistory();

    expect(getMock).toHaveBeenCalledWith('/parking-events/history');
    expect(result).toEqual([parkingEvent]);
  });

  it('getParkingEvents fetches all parking events', async () => {
    getMock.mockResolvedValue({ data: [parkingEvent] });

    const result = await getParkingEvents();

    expect(getMock).toHaveBeenCalledWith('/parking-events');
    expect(result).toEqual([parkingEvent]);
  });

  it('getParkingEvent fetches parking event by id', async () => {
    getMock.mockResolvedValue({ data: parkingEvent });

    const result = await getParkingEvent(10);

    expect(getMock).toHaveBeenCalledWith('/parking-events/10');
    expect(result).toEqual(parkingEvent);
  });
});