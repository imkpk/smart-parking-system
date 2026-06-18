import { Stack } from '@mui/material';
import { DashboardMetricGrid } from '../../components/dashboard/DashboardMetricGrid';
import { LotUtilizationSection } from '../../components/dashboard/LotUtilizationSection';
import { OccupancySummarySection } from '../../components/dashboard/OccupancySummarySection';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { RecentActivityTable } from '../../components/dashboard/RecentActivityTable';
import {
  buildPlatformOverviewMetrics,
  buildTenantAdminMetrics,
} from '../../lib/operatorDashboardMetrics';

export function AdminDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Admin role is required for this dashboard.">
      {(metrics) => (
        <Stack spacing={3}>
          {metrics.scope === 'PLATFORM' ? (
            <DashboardMetricGrid metrics={buildPlatformOverviewMetrics(metrics)} />
          ) : null}

          {metrics.occupancy ? <OccupancySummarySection occupancy={metrics.occupancy} /> : null}

          <DashboardMetricGrid metrics={buildTenantAdminMetrics(metrics)} />

          {metrics.scope === 'TENANT' ? <LotUtilizationSection items={metrics.lotUtilization} /> : null}

          <RecentActivityTable items={metrics.recentActivity} />
        </Stack>
      )}
    </OperatorDashboardShell>
  );
}