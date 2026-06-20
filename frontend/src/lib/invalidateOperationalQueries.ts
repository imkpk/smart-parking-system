import { QueryClient } from '@tanstack/react-query';

type InvalidateOperationalQueriesOptions = {
  parkingLotId?: number;
};

export async function invalidateOperationalQueries(
  queryClient: QueryClient,
  options: InvalidateOperationalQueriesOptions = {},
) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['parking-events'] }),
    queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    queryClient.invalidateQueries({ queryKey: ['parking-lots'] }),
    queryClient.invalidateQueries({ queryKey: ['slot-map'] }),
  ];

  if (options.parkingLotId != null) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['parking-lots', options.parkingLotId] }),
    );
  }

  await Promise.all(invalidations);
}