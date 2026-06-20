import { Fragment } from 'react';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { SecurityQuickActions } from '../../components/dashboard/SecurityQuickActions';
import { TenantOperatorDashboardLayout } from '../../components/dashboard/TenantOperatorDashboardLayout';
import { buildSecurityHeroKpis } from '../../lib/operatorDashboardMetrics';

export function SecurityDashboardPage() {
  return (
    <OperatorDashboardShell
      accessDeniedMessage="Access denied. Security role is required for this dashboard."
      topContent={<SecurityQuickActions />}
    >
      {(metrics) => (
        <Fragment>
          <TenantOperatorDashboardLayout
            heroMetrics={buildSecurityHeroKpis(metrics)}
          lotUtilization={metrics.lotUtilization}
          occupancy={metrics.occupancy}
            showLotUtilization={false}
          />
        </Fragment>
      )}
    </OperatorDashboardShell>
  );
}