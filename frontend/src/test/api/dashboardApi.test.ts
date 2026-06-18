import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: getMock,
  },
}));

import { getAdminSummary, getSlotStatusSummary } from '@/api/dashboardApi';

describe('dashboardApi', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('getAdminSummary fetches admin dashboard summary', async () => {
    const summary = {
      totalUsers: 10,
      totalParkingLots: 2,
      totalSlots: 50,
      availableSlots: 30,
      occupiedSlots: 15,
      reservedSlots: 3,
      maintenanceSlots: 2,
      totalBookings: 100,
      activeParkingEvents: 5,
      completedParkingEvents: 95,
    };
    getMock.mockResolvedValue({ data: summary });

    const result = await getAdminSummary();

    expect(getMock).toHaveBeenCalledWith('/dashboard/admin-summary');
    expect(result).toEqual(summary);
  });

  it('getSlotStatusSummary fetches slot status summary', async () => {
    const summary = {
      availableSlots: 30,
      occupiedSlots: 15,
      reservedSlots: 3,
      maintenanceSlots: 2,
    };
    getMock.mockResolvedValue({ data: summary });

    const result = await getSlotStatusSummary();

    expect(getMock).toHaveBeenCalledWith('/dashboard/slot-status-summary');
    expect(result).toEqual(summary);
  });
});