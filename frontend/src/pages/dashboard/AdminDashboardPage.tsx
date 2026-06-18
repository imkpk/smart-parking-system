import { Stack } from '@mui/material';
import { DashboardHeroKpiRow } from '../../components/dashboard/DashboardHeroKpiRow';
import { DashboardSummaryColumns } from '../../components/dashboard/DashboardSummaryColumns';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { RecentActivityTimeline } from '../../components/dashboard/RecentActivityTimeline';
import { SlotStatusDonutChart } from '../../components/dashboard/SlotStatusDonutChart';
import { TenantOperatorDashboardLayout } from '../../components/dashboard/TenantOperatorDashboardLayout';
import {
  buildPlatformHeroKpis,
  buildTenantHeroKpis,
} from '../../lib/operatorDashboardMetrics';

export function AdminDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Admin role is required for this dashboard.">
      {(metrics) =>
        metrics.scope === 'PLATFORM' ? (
          <Stack spacing={2}>
            <DashboardHeroKpiRow metrics={buildPlatformHeroKpis(metrics)} />
            {metrics.occupancy ? (
              <DashboardSummaryColumns
                left={
                  <SlotStatusDonutChart
                    lotUtilization={metrics.lotUtilization}
                    occupancy={metrics.occupancy}
                  />
                }
                leftLg={6}
                leftMd={6}
                rightLg={6}
                rightMd={6}
              />
            ) : (
              <RecentActivityTimeline />
            )}
          </Stack>
        ) : (
          <TenantOperatorDashboardLayout
            heroMetrics={buildTenantHeroKpis(metrics)}
            lotUtilization={metrics.lotUtilization}
            occupancy={metrics.occupancy}
          />
        )
      }
    </OperatorDashboardShell>
  );
}