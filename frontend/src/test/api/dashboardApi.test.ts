import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getOnboardingStatus,
  getOperatorMetrics,
  getRecentActivity,
} from '@/api/dashboardApi';

const getMock = vi.fn();

vi.mock('@/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

describe('dashboardApi', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('fetches onboarding status', async () => {
    getMock.mockResolvedValue({
      data: {
        hasLot: true,
        hasFloor: false,
        hasSlot: false,
        hasTeamAccess: true,
        firstLotId: 1,
        firstLotWithFloorsId: null,
      },
    });

    await expect(getOnboardingStatus()).resolves.toEqual({
      hasLot: true,
      hasFloor: false,
      hasSlot: false,
      hasTeamAccess: true,
      firstLotId: 1,
      firstLotWithFloorsId: null,
    });
    expect(getMock).toHaveBeenCalledWith('/dashboard/onboarding-status');
  });

  it('fetches operator metrics', async () => {
    getMock.mockResolvedValue({ data: { scope: 'TENANT' } });

    await expect(getOperatorMetrics()).resolves.toEqual({ scope: 'TENANT' });
    expect(getMock).toHaveBeenCalledWith('/dashboard/operator-metrics');
  });

  it('fetches recent activity with cursor pagination params', async () => {
    getMock.mockResolvedValue({
      data: {
        items: [],
        nextCursor: 'opaque',
        hasMore: true,
      },
    });

    await expect(
      getRecentActivity({ limit: 5, cursor: 'opaque', q: 'Lot A' }),
    ).resolves.toEqual({
      items: [],
      nextCursor: 'opaque',
      hasMore: true,
    });
    expect(getMock).toHaveBeenCalledWith('/dashboard/recent-activity', {
      params: { limit: 5, cursor: 'opaque', q: 'Lot A' },
    });
  });
});