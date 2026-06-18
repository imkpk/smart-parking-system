import { Stack } from '@mui/material';
import { ReactNode } from 'react';
import { DashboardHeroKpiRow } from './DashboardHeroKpiRow';
import { DashboardSummaryColumns } from './DashboardSummaryColumns';
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
    <Stack spacing={2.5} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      <DashboardHeroKpiRow metrics={heroMetrics} />

      {occupancy ? (
        <DashboardSummaryColumns
          left={
            <>
              <SlotStatusDonutChart lotUtilization={lotUtilization} occupancy={occupancy} />
              {showLotUtilization ? <LotUtilizationCompactList items={lotUtilization} /> : null}
            </>
          }
          leftLg={showLotUtilization ? 7 : 6}
          leftMd={showLotUtilization ? 7 : 6}
          rightLg={showLotUtilization ? 5 : 6}
          rightMd={showLotUtilization ? 5 : 6}
        />
      ) : (
        <RecentActivityTimeline />
      )}

      {extraContent}
    </Stack>
  );
}