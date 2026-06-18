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
              <Grid alignItems="flex-start" container spacing={2}>
                <Grid item lg={6} md={6} xs={12}>
                  <SlotStatusDonutChart
                    lotUtilization={metrics.lotUtilization}
                    occupancy={metrics.occupancy}
                  />
                </Grid>
                <Grid item lg={6} md={6} xs={12}>
                  <RecentActivityTimeline fillHeight />
                </Grid>
              </Grid>
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