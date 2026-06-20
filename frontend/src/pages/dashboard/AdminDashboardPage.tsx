import { Fragment } from 'react';
import { DashboardHeroKpiRow } from '../../components/dashboard/DashboardHeroKpiRow';
import { DashboardSummaryColumns } from '../../components/dashboard/DashboardSummaryColumns';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { RecentActivityTimeline } from '../../components/dashboard/RecentActivityTimeline';
import { SlotStatusDonutChart } from '../../components/dashboard/SlotStatusDonutChart';
import { TenantOperatorDashboardLayout } from '../../components/dashboard/TenantOperatorDashboardLayout';
import { TenantAdminQuickActions } from '../../components/dashboard/TenantAdminQuickActions';
import { UserSummaryCard } from '../../components/dashboard/UserSummaryCard';
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
          </Fragment>
        ) : (
          <Fragment>
            <TenantAdminQuickActions />
            <TenantOperatorDashboardLayout
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