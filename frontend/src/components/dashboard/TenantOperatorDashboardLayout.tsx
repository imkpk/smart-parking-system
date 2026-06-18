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
        <Grid container spacing={2}>
          <Grid item lg={showLotUtilization ? 5 : 12} md={showLotUtilization ? 5 : 12} xs={12}>
            <SlotStatusDonutChart occupancy={occupancy} />
          </Grid>
          {showLotUtilization ? (
            <Grid item lg={7} md={7} xs={12}>
              <LotUtilizationCompactList items={lotUtilization} />
            </Grid>
          ) : null}
        </Grid>
      ) : null}

      {extraContent}

      <RecentActivityTimeline />
    </Stack>
  );
}