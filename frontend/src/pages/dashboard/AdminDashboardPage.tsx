import { Stack } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { DashboardHeroKpiRow } from '../../components/dashboard/DashboardHeroKpiRow';
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
          <Stack spacing={2.5}>
            <DashboardHeroKpiRow metrics={buildPlatformHeroKpis(metrics)} />
            {metrics.occupancy ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <SlotStatusDonutChart occupancy={metrics.occupancy} />
                </Grid>
              </Grid>
            ) : null}
            <RecentActivityTimeline />
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