import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getRecentActivity } from '../../api/dashboardApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatActivityTypeLabel } from '../../lib/operatorDashboardLabels';
import { formatDateTime, formatRelativeTime } from '../../lib/formatters';
import { getStatusStyle } from '../../lib/statusStyles';
import { RecentActivityItem } from '../../types/operatorDashboard';
import { EmptyState } from '../common/EmptyState';
import { ParkingEventStatusChip } from '../common/ParkingEventStatusChip';
import { SearchField } from '../common/SearchField';

const ACTIVITY_PAGE_SIZE = 10;
const ACTIVITY_PANEL_MIN_HEIGHT = 420;

function formatActivityLocation(item: RecentActivityItem) {
  const parts = [item.parkingLotName, item.floorName, item.slotNumber].filter(Boolean);
  return parts.join(' · ');
}

function ActivityTimelineItem({ item }: { item: RecentActivityItem }) {
  const statusStyle = getStatusStyle(item.status);
  const timestamp =
    item.activityType === 'CHECK_OUT' ? item.checkOutTime ?? item.checkInTime : item.checkInTime;

  return (
    <Stack
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ width: '100%' }}
    >
      <Stack alignItems="center" direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: statusStyle.bgcolor,
            borderRadius: '50%',
            color: statusStyle.borderColor,
            display: 'flex',
            flexShrink: 0,
            height: 32,
            justifyContent: 'center',
            width: 32,
          }}
        >
          {item.activityType === 'CHECK_IN' ? (
            <LoginIcon sx={{ fontSize: 16 }} />
          ) : (
            <LogoutIcon sx={{ fontSize: 16 }} />
          )}
        </Box>

        <Stack minWidth={0} spacing={0.25} sx={{ flex: 1 }}>
          <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1}>
            <Typography fontWeight={600} noWrap variant="body2">
              {formatActivityTypeLabel(item.activityType)}
            </Typography>
            <ParkingEventStatusChip status={item.status} />
          </Stack>
          <Typography fontWeight={600} noWrap variant="body2">
            {item.vehicleNumber}
          </Typography>
        </Stack>
      </Stack>

      <Typography
        color="text.secondary"
        noWrap
        sx={{ flex: 1.2, minWidth: 0, textAlign: { xs: 'left', sm: 'center' } }}
        variant="body2"
      >
        {formatActivityLocation(item)}
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ flexShrink: 0, minWidth: 88, textAlign: { xs: 'left', sm: 'right' } }}
        title={formatDateTime(timestamp)}
        variant="caption"
      >
        {formatRelativeTime(timestamp)}
      </Typography>
    </Stack>
  );
}

export function RecentActivityTimeline({ fillHeight = false }: { fillHeight?: boolean }) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const activityQuery = useInfiniteQuery({
    queryKey: ['dashboard', 'recent-activity', debouncedSearch],
    queryFn: ({ pageParam }) =>
      getRecentActivity({
        limit: ACTIVITY_PAGE_SIZE,
        cursor: pageParam,
        q: debouncedSearch || undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const items = activityQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMore = activityQuery.data?.pages.at(-1)?.hasMore ?? false;
  const isInitialLoading = activityQuery.isLoading;
  const isLoadingMore = activityQuery.isFetchingNextPage;
  const isSearching = searchInput.trim() !== debouncedSearch;
  const { fetchNextPage } = activityQuery;

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const sentinel = loadMoreRef.current;
    const scrollRoot = scrollContainerRef.current;

    if (!sentinel || !scrollRoot || !hasMore || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { root: scrollRoot, rootMargin: '120px', threshold: 0 },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasMore, isLoadingMore, items.length]);

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: fillHeight ? ACTIVITY_PANEL_MIN_HEIGHT : 'auto',
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 1.5,
          minHeight: 0,
          pb: 2,
          pt: 2,
          '&:last-child': { pb: 2 },
        }}
      >
        <Stack spacing={1.25}>
          <Typography component="h2" variant="h6">
            Recent Activity
          </Typography>
          <SearchField
            label="Search activity"
            onChange={(event) => setSearchInput(event.target.value)}
            onClear={() => setSearchInput('')}
            placeholder="Vehicle, lot, floor, or slot"
            value={searchInput}
          />
        </Stack>

        {isInitialLoading || isSearching ? (
          <Stack alignItems="center" flex={1} justifyContent="center" minHeight={240}>
            <CircularProgress size={28} />
          </Stack>
        ) : null}

        {activityQuery.error ? (
          <Alert severity="error">
            {getApiErrorMessage(activityQuery.error, 'Could not load recent activity.')}
          </Alert>
        ) : null}

        {!isInitialLoading && !isSearching && !activityQuery.error && items.length === 0 ? (
          <EmptyState
            description={
              debouncedSearch
                ? 'Try a different vehicle number, lot name, floor, or slot.'
                : 'Check-ins and check-outs will appear here as parking sessions happen.'
            }
            illustration="empty"
            title={debouncedSearch ? 'No matching activity' : 'No recent activity'}
          />
        ) : null}

        {!isInitialLoading && !isSearching && !activityQuery.error && items.length > 0 ? (
          <Box
            ref={scrollContainerRef}
            sx={{
              flex: 1,
              maxHeight: fillHeight ? 'none' : ACTIVITY_PANEL_MIN_HEIGHT,
              minHeight: 240,
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider', my: 1.25 }} />} spacing={1.25}>
              {items.map((item) => (
                <ActivityTimelineItem item={item} key={item.parkingEventId} />
              ))}
            </Stack>

            <Box ref={loadMoreRef} sx={{ height: 1, py: 1 }}>
              {isLoadingMore ? (
                <Stack alignItems="center" py={1}>
                  <CircularProgress size={20} />
                </Stack>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}