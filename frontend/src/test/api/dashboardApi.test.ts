import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOperatorMetrics, getRecentActivity } from '@/api/dashboardApi';

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

    await expect(getRecentActivity({ limit: 5, cursor: 'opaque' })).resolves.toEqual({
      items: [],
      nextCursor: 'opaque',
      hasMore: true,
    });
    expect(getMock).toHaveBeenCalledWith('/dashboard/recent-activity', {
      params: { limit: 5, cursor: 'opaque' },
    });
  });
});