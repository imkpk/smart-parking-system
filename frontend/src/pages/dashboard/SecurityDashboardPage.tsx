import { Stack } from '@mui/material';
import { DashboardMetricGrid } from '../../components/dashboard/DashboardMetricGrid';
import { OccupancySummarySection } from '../../components/dashboard/OccupancySummarySection';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { RecentActivityTable } from '../../components/dashboard/RecentActivityTable';
import { buildSecurityMetrics } from '../../lib/operatorDashboardMetrics';

export function SecurityDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Security role is required for this dashboard.">
      {(metrics) => (
        <Stack spacing={3}>
          {metrics.occupancy ? <OccupancySummarySection occupancy={metrics.occupancy} /> : null}

          <DashboardMetricGrid metrics={buildSecurityMetrics(metrics)} />

          <RecentActivityTable items={metrics.recentActivity} />
        </Stack>
      )}
    </OperatorDashboardShell>
  );
}