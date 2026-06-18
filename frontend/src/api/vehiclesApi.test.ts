import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('./client', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}));

import {
  createVehicle,
  deleteVehicle,
  getMyVehicles,
  getVehicle,
  getVehicles,
  updateVehicle,
} from './vehiclesApi';

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

describe('vehiclesApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it('createVehicle posts vehicle payload', async () => {
    postMock.mockResolvedValue({ data: vehicle });
    const payload = { vehicleNumber: 'KA01AB1234', vehicleType: 'CAR' as const };

    const result = await createVehicle(payload);

    expect(postMock).toHaveBeenCalledWith('/vehicles', payload);
    expect(result).toEqual(vehicle);
  });

  it('getMyVehicles fetches current user vehicles', async () => {
    getMock.mockResolvedValue({ data: [vehicle] });

    const result = await getMyVehicles();

    expect(getMock).toHaveBeenCalledWith('/vehicles/my');
    expect(result).toEqual([vehicle]);
  });

  it('getVehicles fetches all vehicles', async () => {
    getMock.mockResolvedValue({ data: [vehicle] });

    const result = await getVehicles();

    expect(getMock).toHaveBeenCalledWith('/vehicles');
    expect(result).toEqual([vehicle]);
  });

  it('getVehicle fetches vehicle by id', async () => {
    getMock.mockResolvedValue({ data: vehicle });

    const result = await getVehicle(3);

    expect(getMock).toHaveBeenCalledWith('/vehicles/3');
    expect(result).toEqual(vehicle);
  });

  it('updateVehicle patches vehicle by id', async () => {
    patchMock.mockResolvedValue({ data: { ...vehicle, color: 'Black' } });
    const payload = { vehicleNumber: 'KA01AB1234', vehicleType: 'CAR' as const, color: 'Black' };

    const result = await updateVehicle(3, payload);

    expect(patchMock).toHaveBeenCalledWith('/vehicles/3', payload);
    expect(result.color).toBe('Black');
  });

  it('deleteVehicle deletes vehicle by id', async () => {
    deleteMock.mockResolvedValue({ data: vehicle });

    const result = await deleteVehicle(3);

    expect(deleteMock).toHaveBeenCalledWith('/vehicles/3');
    expect(result).toEqual(vehicle);
  });
});