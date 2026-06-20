import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateOperationalQueries } from '@/lib/invalidateOperationalQueries';

describe('invalidateOperationalQueries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('invalidates dashboard, parking events, bookings, parking lots, and slot map queries', async () => {
    await invalidateOperationalQueries(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dashboard'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-events'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bookings'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-lots'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['slot-map'],
    });
  });

  it('invalidates a specific parking lot summary when parkingLotId is provided', async () => {
    await invalidateOperationalQueries(queryClient, { parkingLotId: 7 });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-lots', 7],
    });
  });
});