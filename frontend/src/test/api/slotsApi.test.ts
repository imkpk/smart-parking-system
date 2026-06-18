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
  createBulkSlots,
  createSlot,
  deleteSlot,
  deleteSlots,
  getAvailableSlots,
  getSlots,
  updateSlotStatus,
} from '@/api/slotsApi';

const slot = {
  id: 4,
  slotNumber: 'A-01',
  slotType: 'CAR' as const,
  status: 'AVAILABLE' as const,
  floorId: 6,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('slotsApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it('getSlots fetches slots for a parking lot', async () => {
    getMock.mockResolvedValue({ data: [slot] });

    const result = await getSlots(5);

    expect(getMock).toHaveBeenCalledWith('/parking-lots/5/slots');
    expect(result).toEqual([slot]);
  });

  it('getAvailableSlots fetches available slots for a parking lot', async () => {
    getMock.mockResolvedValue({ data: [slot] });

    const result = await getAvailableSlots(5);

    expect(getMock).toHaveBeenCalledWith('/parking-lots/5/available-slots');
    expect(result).toEqual([slot]);
  });

  it('createSlot posts slot payload to floor', async () => {
    postMock.mockResolvedValue({ data: slot });
    const payload = { slotNumber: 'A-01', slotType: 'CAR' as const };

    const result = await createSlot(6, payload);

    expect(postMock).toHaveBeenCalledWith('/floors/6/slots', payload);
    expect(result).toEqual(slot);
  });

  it('createBulkSlots posts bulk slot payload', async () => {
    postMock.mockResolvedValue({ data: [slot] });
    const slots = [{ slotNumber: 'A-01' }, { slotNumber: 'A-02' }];

    const result = await createBulkSlots(6, slots);

    expect(postMock).toHaveBeenCalledWith('/floors/6/slots/bulk', { slots });
    expect(result).toEqual([slot]);
  });

  it('updateSlotStatus patches slot status', async () => {
    patchMock.mockResolvedValue({ data: { ...slot, status: 'OCCUPIED' } });

    const result = await updateSlotStatus(4, 'OCCUPIED');

    expect(patchMock).toHaveBeenCalledWith('/slots/4/status', { status: 'OCCUPIED' });
    expect(result.status).toBe('OCCUPIED');
  });

  it('deleteSlot deletes slot by id', async () => {
    deleteMock.mockResolvedValue({ data: slot });

    const result = await deleteSlot(4);

    expect(deleteMock).toHaveBeenCalledWith('/slots/4');
    expect(result).toEqual(slot);
  });

  it('deleteSlots deletes multiple slots by ids', async () => {
    deleteMock.mockResolvedValue({ data: [slot] });

    const result = await deleteSlots([4, 5]);

    expect(deleteMock).toHaveBeenCalledWith('/slots', { data: { ids: [4, 5] } });
    expect(result).toEqual([slot]);
  });
});