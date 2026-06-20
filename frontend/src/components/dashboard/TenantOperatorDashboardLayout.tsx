import { Fragment, ReactNode } from 'react';
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
  belowHeroContent,
  extraContent,
}: {
  heroMetrics: DashboardMetricItem[];
  occupancy: OccupancySummary | null;
  lotUtilization: LotUtilizationItem[];
  showLotUtilization?: boolean;
  belowHeroContent?: ReactNode;
  extraContent?: ReactNode;
}) {
  return (
    <Fragment>
      <DashboardHeroKpiRow metrics={heroMetrics} />
      {belowHeroContent}

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
    </Fragment>
  );
}