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

import { createFloor, deleteFloor, getFloors, updateFloor } from '@/api/floorsApi';

const floor = {
  id: 1,
  name: 'Level 1',
  level: 1,
  parkingLotId: 5,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('floorsApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it('getFloors fetches floors for a parking lot', async () => {
    getMock.mockResolvedValue({ data: [floor] });

    const result = await getFloors(5);

    expect(getMock).toHaveBeenCalledWith('/parking-lots/5/floors');
    expect(result).toEqual([floor]);
  });

  it('createFloor posts floor payload', async () => {
    postMock.mockResolvedValue({ data: floor });
    const payload = { name: 'Level 1', level: 1 };

    const result = await createFloor(5, payload);

    expect(postMock).toHaveBeenCalledWith('/parking-lots/5/floors', payload);
    expect(result).toEqual(floor);
  });

  it('updateFloor patches floor by id', async () => {
    patchMock.mockResolvedValue({ data: { ...floor, name: 'Level 2' } });
    const payload = { name: 'Level 2' };

    const result = await updateFloor(1, payload);

    expect(patchMock).toHaveBeenCalledWith('/floors/1', payload);
    expect(result.name).toBe('Level 2');
  });

  it('deleteFloor deletes floor by id', async () => {
    deleteMock.mockResolvedValue({ data: floor });

    const result = await deleteFloor(1);

    expect(deleteMock).toHaveBeenCalledWith('/floors/1');
    expect(result).toEqual(floor);
  });
});