import Grid from '@mui/material/GridLegacy';
import { Stack } from '@mui/material';
import { ReactNode } from 'react';
import { DashboardHeroKpiRow } from './DashboardHeroKpiRow';
import { LotUtilizationCompactList } from './LotUtilizationCompactList';
import { RecentActivityTimeline } from './RecentActivityTimeline';
import { SlotStatusDonutChart } from './SlotStatusDonutChart';
import { DashboardMetricItem } from '../../lib/operatorDashboardMetrics';
import { LotUtilizationItem, OccupancySummary } from '../../types/operatorDashboard';

export function TenantOperatorDashboardLayout({
  heroMetrics,
  occupancy,
  lotUtilization,
  showLotUtilization = true,
  extraContent,
}: {
  heroMetrics: DashboardMetricItem[];
  occupancy: OccupancySummary | null;
  lotUtilization: LotUtilizationItem[];
  showLotUtilization?: boolean;
  extraContent?: ReactNode;
}) {
  return (
    <Stack spacing={2.5}>
      <DashboardHeroKpiRow metrics={heroMetrics} />

      {occupancy ? (
        <Grid alignItems="stretch" container spacing={2}>
          <Grid item lg={showLotUtilization ? 7 : 6} md={showLotUtilization ? 7 : 6} xs={12}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              <SlotStatusDonutChart occupancy={occupancy} />
              {showLotUtilization ? <LotUtilizationCompactList items={lotUtilization} /> : null}
            </Stack>
          </Grid>
          <Grid item lg={showLotUtilization ? 5 : 6} md={showLotUtilization ? 5 : 6} xs={12}>
            <RecentActivityTimeline fillHeight />
          </Grid>
        </Grid>
      ) : (
        <RecentActivityTimeline />
      )}

      {extraContent}
    </Stack>
  );
}