import {
  Alert,
  CircularProgress,
  Grid,
  Stack,
} from '@mui/material';
import {
  CalendarMonth,
  CheckCircle,
  EventAvailable,
  Garage,
  Group,
  LocalParking,
  PendingActions,
  ReportProblem,
  TaskAlt,
  TimeToLeave,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getAdminSummary, getSlotStatusSummary } from '../../api/dashboardApi';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';

export function AdminDashboardPage() {
  const adminSummaryQuery = useQuery({
    queryKey: ['dashboard', 'admin-summary'],
    queryFn: getAdminSummary,
  });
  const slotStatusQuery = useQuery({
    queryKey: ['dashboard', 'slot-status-summary'],
    queryFn: getSlotStatusSummary,
  });

  const isLoading = adminSummaryQuery.isLoading || slotStatusQuery.isLoading;
  const error = adminSummaryQuery.error ?? slotStatusQuery.error;
  const summary = adminSummaryQuery.data;
  const slotSummary = slotStatusQuery.data;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Admin Dashboard"
        description="Operational summary for parking lots, slots, bookings, and parking events."
      />

      {isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {error ? (
        <Alert severity={isForbiddenError(error) ? 'warning' : 'error'}>
          {isForbiddenError(error)
            ? 'Access denied. Admin role is required for this dashboard.'
            : getApiErrorMessage(error, 'Could not load dashboard summary.')}
        </Alert>
      ) : null}

      {summary ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon={<Group />} label="Total Users" value={summary.totalUsers} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon={<Garage />} label="Parking Lots" value={summary.totalParkingLots} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon={<LocalParking />} label="Total Slots" value={summary.totalSlots} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              icon={<CheckCircle />}
              label="Available Slots"
              value={slotSummary?.availableSlots ?? summary.availableSlots}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              icon={<TimeToLeave />}
              label="Occupied Slots"
              value={slotSummary?.occupiedSlots ?? summary.occupiedSlots}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              icon={<PendingActions />}
              label="Reserved Slots"
              value={slotSummary?.reservedSlots ?? summary.reservedSlots}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              icon={<ReportProblem />}
              label="Maintenance Slots"
              value={slotSummary?.maintenanceSlots ?? summary.maintenanceSlots}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon={<CalendarMonth />} label="Total Bookings" value={summary.totalBookings} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              icon={<EventAvailable />}
              label="Active Parking Events"
              value={summary.activeParkingEvents}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              icon={<TaskAlt />}
              label="Completed Parking Events"
              value={summary.completedParkingEvents}
            />
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
}
