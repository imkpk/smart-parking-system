import { Fragment } from 'react';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { SecurityQuickActions } from '../../components/dashboard/SecurityQuickActions';
import { TenantOperatorDashboardLayout } from '../../components/dashboard/TenantOperatorDashboardLayout';
import { buildSecurityHeroKpis } from '../../lib/operatorDashboardMetrics';

export function SecurityDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Security role is required for this dashboard.">
      {(metrics) => (
        <TenantOperatorDashboardLayout
          belowHeroContent={<SecurityQuickActions />}
          heroMetrics={buildSecurityHeroKpis(metrics)}
          lotUtilization={metrics.lotUtilization}
          occupancy={metrics.occupancy}
          showLotUtilization={false}
        />
      )}
    </OperatorDashboardShell>
  );
}