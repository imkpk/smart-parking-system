import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
const ACTIVITY_PANEL_MIN_HEIGHT = 320;

function formatActivityLocation(item: RecentActivityItem) {
  const parts = [item.parkingLotName, item.floorName, item.slotNumber].filter(Boolean);
  return parts.join(' · ');
}

function ActivityTimelineItem({ item }: { item: RecentActivityItem }) {
  const statusStyle = getStatusStyle(item.status);
  const timestamp =
    item.activityType === 'CHECK_OUT' ? item.checkOutTime ?? item.checkInTime : item.checkInTime;

  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.5, width: '100%' }}>
      <Box
        sx={{
          alignItems: 'center',
          bgcolor: statusStyle.bgcolor,
          borderRadius: '50%',
          color: statusStyle.borderColor,
          display: 'flex',
          flexShrink: 0,
          height: 40,
          justifyContent: 'center',
          mt: 0.5,
          width: 40,
        }}
      >
        {item.activityType === 'CHECK_IN' ? (
          <LoginIcon sx={{ fontSize: 20 }} />
        ) : (
          <LogoutIcon sx={{ fontSize: 20 }} />
        )}
      </Box>

      <Stack flex={1} minWidth={0} spacing={0.75}>
        <Stack
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={0.75}
        >
          <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1}>
            <Typography fontWeight={600} variant="subtitle2">
              {formatActivityTypeLabel(item.activityType)}
            </Typography>
            <ParkingEventStatusChip status={item.status} />
          </Stack>
          <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }} variant="caption">
            {formatRelativeTime(timestamp)}
          </Typography>
        </Stack>

        <Typography
          sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em', wordBreak: 'break-word' }}
          variant="subtitle1"
        >
          {item.vehicleNumber}
        </Typography>

        <Typography color="text.secondary" sx={{ lineHeight: 1.45, wordBreak: 'break-word' }} variant="body2">
          {formatActivityLocation(item)}
        </Typography>

        <Typography color="text.disabled" variant="caption">
          {formatDateTime(timestamp)}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function RecentActivityTimeline({
  fillHeight = false,
  matchedHeight,
  showViewAllLink = true,
  sx,
  viewAllHref = '/parking-events',
}: {
  fillHeight?: boolean;
  matchedHeight?: number;
  showViewAllLink?: boolean;
  sx?: SxProps<Theme>;
  viewAllHref?: string;
}) {
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
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        ...(fillHeight
          ? matchedHeight
            ? {
                flex: 'none',
                height: matchedHeight,
                minHeight: 0,
              }
            : {
                flex: 1,
                minHeight: 0,
              }
          : {}),
        ...sx,
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
          <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={2}>
            <Typography component="h2" variant="h6">
              Recent Activity
            </Typography>
            {showViewAllLink ? (
              <Link component={RouterLink} to={viewAllHref} underline="hover" variant="body2">
                View all activity
              </Link>
            ) : null}
          </Stack>
          <SearchField
            label="Search activity"
            onChange={(event) => setSearchInput(event.target.value)}
            onClear={() => setSearchInput('')}
            placeholder="Vehicle, lot, floor, or slot"
            value={searchInput}
          />
        </Stack>

        {isInitialLoading || isSearching ? (
          <Stack alignItems="center" flex={1} justifyContent="center" minHeight={fillHeight ? 0 : 280}>
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
              minHeight: fillHeight ? 0 : 240,
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider', my: 2 }} />} spacing={2}>
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