import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}));

import {
  createParkingLot,
  deleteParkingLot,
  getParkingLot,
  getParkingLots,
  updateParkingLot,
} from '@/api/parkingLotsApi';

const parkingLot = {
  id: 1,
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

describe('parkingLotsApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it('getParkingLots fetches all parking lots', async () => {
    getMock.mockResolvedValue({ data: [parkingLot] });

    const result = await getParkingLots();

    expect(getMock).toHaveBeenCalledWith('/parking-lots');
    expect(result).toEqual([parkingLot]);
  });

  it('getParkingLot fetches parking lot by id', async () => {
    getMock.mockResolvedValue({ data: parkingLot });

    const result = await getParkingLot(1);

    expect(getMock).toHaveBeenCalledWith('/parking-lots/1');
    expect(result).toEqual(parkingLot);
  });

  it('createParkingLot posts parking lot payload', async () => {
    postMock.mockResolvedValue({ data: parkingLot });
    const payload = { name: 'Main Lot', type: 'MALL' as const };

    const result = await createParkingLot(payload);

    expect(postMock).toHaveBeenCalledWith('/parking-lots', payload);
    expect(result).toEqual(parkingLot);
  });

  it('updateParkingLot patches parking lot by id', async () => {
    patchMock.mockResolvedValue({ data: { ...parkingLot, name: 'Updated Lot' } });
    const payload = { name: 'Updated Lot', type: 'MALL' as const };

    const result = await updateParkingLot(1, payload);

    expect(patchMock).toHaveBeenCalledWith('/parking-lots/1', payload);
    expect(result.name).toBe('Updated Lot');
  });

  it('deleteParkingLot deletes parking lot by id', async () => {
    deleteMock.mockResolvedValue({ data: parkingLot });

    const result = await deleteParkingLot(1);

    expect(deleteMock).toHaveBeenCalledWith('/parking-lots/1');
    expect(result).toEqual(parkingLot);
  });
});