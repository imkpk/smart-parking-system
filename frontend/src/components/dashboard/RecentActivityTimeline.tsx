import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getRecentActivity } from '../../api/dashboardApi';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatActivityTypeLabel } from '../../lib/operatorDashboardLabels';
import { formatDateTime, formatRelativeTime } from '../../lib/formatters';
import { getStatusStyle } from '../../lib/statusStyles';
import { RecentActivityItem } from '../../types/operatorDashboard';
import { EmptyState } from '../common/EmptyState';
import { ParkingEventStatusChip } from '../common/ParkingEventStatusChip';

const ACTIVITY_PAGE_SIZE = 5;

function formatActivityLocation(item: RecentActivityItem) {
  const parts = [item.parkingLotName, item.floorName, item.slotNumber].filter(Boolean);
  return parts.join(' · ');
}

function ActivityTimelineItem({ item }: { item: RecentActivityItem }) {
  const statusStyle = getStatusStyle(item.status);
  const timestamp =
    item.activityType === 'CHECK_OUT' ? item.checkOutTime ?? item.checkInTime : item.checkInTime;

  return (
    <Stack direction="row" spacing={1.5}>
      <Box
        sx={{
          alignItems: 'center',
          bgcolor: statusStyle.bgcolor,
          borderRadius: '50%',
          color: statusStyle.borderColor,
          display: 'flex',
          flexShrink: 0,
          height: 36,
          justifyContent: 'center',
          width: 36,
        }}
      >
        {item.activityType === 'CHECK_IN' ? (
          <LoginIcon fontSize="small" />
        ) : (
          <LogoutIcon fontSize="small" />
        )}
      </Box>

      <Stack flex={1} spacing={0.5}>
        <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1}>
          <Typography fontWeight={600} variant="body2">
            {formatActivityTypeLabel(item.activityType)}
          </Typography>
          <ParkingEventStatusChip status={item.status} />
        </Stack>
        <Typography variant="body2">{item.vehicleNumber}</Typography>
        <Typography color="text.secondary" variant="body2">
          {formatActivityLocation(item)}
        </Typography>
        <Typography color="text.secondary" title={formatDateTime(timestamp)} variant="caption">
          {formatRelativeTime(timestamp)}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function RecentActivityTimeline() {
  const activityQuery = useInfiniteQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: ({ pageParam }) =>
      getRecentActivity({
        limit: ACTIVITY_PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const items = activityQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMore = activityQuery.data?.pages.at(-1)?.hasMore ?? false;
  const isInitialLoading = activityQuery.isLoading;
  const isLoadingMore = activityQuery.isFetchingNextPage;

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">
        Recent Activity
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          {isInitialLoading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress size={28} />
            </Stack>
          ) : null}

          {activityQuery.error ? (
            <Alert severity="error">
              {getApiErrorMessage(activityQuery.error, 'Could not load recent activity.')}
            </Alert>
          ) : null}

          {!isInitialLoading && !activityQuery.error && items.length === 0 ? (
            <EmptyState
              description="Check-ins and check-outs will appear here as parking sessions happen."
              illustration="empty"
              title="No recent activity"
            />
          ) : null}

          {!isInitialLoading && !activityQuery.error && items.length > 0 ? (
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider', my: 1.5 }} />} spacing={1.5}>
              {items.map((item) => (
                <ActivityTimelineItem item={item} key={item.parkingEventId} />
              ))}
            </Stack>
          ) : null}

          {hasMore ? (
            <Stack alignItems="center" pt={items.length > 0 ? 2 : 0}>
              <Button
                disabled={isLoadingMore}
                onClick={() => activityQuery.fetchNextPage()}
                size="small"
                variant="outlined"
              >
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </Stack>
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}