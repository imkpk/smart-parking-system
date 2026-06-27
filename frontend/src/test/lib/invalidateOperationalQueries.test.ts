import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateOperationalQueries } from '@/lib/invalidateOperationalQueries';

describe('invalidateOperationalQueries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('invalidates targeted check-in keys when affected ids are available', async () => {
    await invalidateOperationalQueries(queryClient, {
      bookingId: 3,
      operation: 'check-in',
      parkingLotId: 7,
      userId: 11,
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-events', 'active'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-events', 'all'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bookings', 'all'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bookings', 'my'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bookings', 3],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-lots', 7],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-lots', 7, 'slots'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['slot-map', 7],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dashboard', 'operator-metrics'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dashboard', 'recent-activity'],
    });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['parking-events'],
    });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['bookings'],
    });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['slot-map'],
    });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['parking-lots'],
    });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['parking-events', 'history'],
    });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['payments', 'all'],
    });
  });

  it('invalidates checkout history, payment, and user payment keys', async () => {
    await invalidateOperationalQueries(queryClient, {
      bookingId: 3,
      operation: 'check-out',
      parkingLotId: 7,
      userId: 11,
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-events', 'active'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-events', 'all'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parking-events', 'history'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['payments', 'summary'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['payments', 'all'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['payments', 'user', 11],
    });
  });

  it('uses exact parking lot list invalidation only when no lot id is available', async () => {
    await invalidateOperationalQueries(queryClient, {
      bookingId: 3,
      operation: 'check-in',
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ['parking-lots'],
    });
  });
});
