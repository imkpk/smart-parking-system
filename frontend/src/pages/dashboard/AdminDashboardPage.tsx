import { Fragment, lazy, Suspense } from 'react';
import { DashboardHeroKpiRow } from '../../components/dashboard/DashboardHeroKpiRow';
import { DashboardSummaryColumns } from '../../components/dashboard/DashboardSummaryColumns';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { TenantOperatorDashboardLayout } from '../../components/dashboard/TenantOperatorDashboardLayout';
import { TenantAdminQuickActions } from '../../components/dashboard/TenantAdminQuickActions';
import { UserSummaryCard } from '../../components/dashboard/UserSummaryCard';

const RecentActivityTimeline = lazy(() =>
  import('../../components/dashboard/RecentActivityTimeline').then((module) => ({
    default: module.RecentActivityTimeline,
  })),
);

const SlotStatusDonutChart = lazy(() =>
  import('../../components/dashboard/SlotStatusDonutChart').then((module) => ({
    default: module.SlotStatusDonutChart,
  })),
);
import {
  buildPlatformHeroKpis,
  buildTenantHeroKpis,
} from '../../lib/operatorDashboardMetrics';

export function AdminDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Admin role is required for this dashboard.">
      {(metrics) =>
        metrics.scope === 'PLATFORM' ? (
          <Fragment>
            <DashboardHeroKpiRow metrics={buildPlatformHeroKpis(metrics)} />
            <TenantAdminQuickActions />
            {metrics.occupancy ? (
              <DashboardSummaryColumns
                left={
                  <Suspense fallback={null}>
                    <SlotStatusDonutChart
                      lotUtilization={metrics.lotUtilization}
                      occupancy={metrics.occupancy}
                    />
                  </Suspense>
                }
                leftLg={6}
                leftMd={6}
                rightLg={6}
                rightMd={6}
              />
            ) : (
              <Suspense fallback={null}>
                <RecentActivityTimeline />
              </Suspense>
            )}
          </Fragment>
        ) : (
          <Fragment>
            <TenantOperatorDashboardLayout
              belowHeroContent={<TenantAdminQuickActions />}
              extraContent={<UserSummaryCard />}
              heroMetrics={buildTenantHeroKpis(metrics)}
              lotUtilization={metrics.lotUtilization}
              occupancy={metrics.occupancy}
            />
          </Fragment>
        )
      }
    </OperatorDashboardShell>
  );
}