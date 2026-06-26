import { QueryCache, QueryClient } from '@tanstack/react-query';

export const QUERY_META_SUPPRESS_CONSOLE_ERROR = 'suppressConsoleError';

export function shouldSuppressQueryConsoleError(
  meta: Record<string, unknown> | undefined,
): boolean {
  return meta?.[QUERY_META_SUPPRESS_CONSOLE_ERROR] === true;
}

export function createAppQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (_error, query) => {
        if (shouldSuppressQueryConsoleError(query.meta)) {
          return;
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
}