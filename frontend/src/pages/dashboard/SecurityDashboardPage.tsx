import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { TenantOperatorDashboardLayout } from '../../components/dashboard/TenantOperatorDashboardLayout';
import { buildTenantHeroKpis } from '../../lib/operatorDashboardMetrics';

export function SecurityDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Security role is required for this dashboard.">
      {(metrics) => (
        <TenantOperatorDashboardLayout
          heroMetrics={buildTenantHeroKpis(metrics)}
          lotUtilization={metrics.lotUtilization}
          occupancy={metrics.occupancy}
          showLotUtilization={false}
        />
      )}
    </OperatorDashboardShell>
  );
}