import { QueryClient } from '@tanstack/react-query';

type InvalidateOperationalQueriesOptions = {
  bookingId?: number;
  operation: 'check-in' | 'check-out';
  parkingLotId?: number;
  userId?: number;
  vehicleType?: string;
};

export async function invalidateOperationalQueries(
  queryClient: QueryClient,
  options: InvalidateOperationalQueriesOptions,
) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['parking-events', 'active'] }),
    queryClient.invalidateQueries({ queryKey: ['parking-events', 'all'] }),
    queryClient.invalidateQueries({ queryKey: ['bookings', 'all'] }),
    queryClient.invalidateQueries({ queryKey: ['bookings', 'my'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'operator-metrics'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-activity'] }),
  ];

  if (options.operation === 'check-out') {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['parking-events', 'history'] }),
      queryClient.invalidateQueries({ queryKey: ['payments', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['payments', 'all'] }),
    );
  }

  if (options.bookingId != null) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['bookings', options.bookingId] }),
    );
  }

  if (options.userId != null && options.operation === 'check-out') {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['payments', 'user', options.userId] }),
    );
  }

  if (options.parkingLotId != null) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['parking-lots', options.parkingLotId] }),
      queryClient.invalidateQueries({ queryKey: ['parking-lots', options.parkingLotId, 'slots'] }),
      queryClient.invalidateQueries({ queryKey: ['slot-map', options.parkingLotId] }),
    );

    if (options.vehicleType) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ['parking-lots', options.parkingLotId, 'available-slots', options.vehicleType],
        }),
      );
    }
  } else {
    invalidations.push(
      queryClient.invalidateQueries({ exact: true, queryKey: ['parking-lots'] }),
    );
  }

  await Promise.all(invalidations);
}
