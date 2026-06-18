import { Stack } from '@mui/material';
import { DashboardMetricGrid } from '../../components/dashboard/DashboardMetricGrid';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { RecentActivityTable } from '../../components/dashboard/RecentActivityTable';
import { buildUserOverviewMetrics } from '../../lib/operatorDashboardMetrics';

export function UserDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Sign in to view your dashboard.">
      {(metrics) => (
        <Stack spacing={3}>
          <DashboardMetricGrid metrics={buildUserOverviewMetrics(metrics)} />

          <RecentActivityTable items={metrics.recentActivity} />
        </Stack>
      )}
    </OperatorDashboardShell>
  );
}