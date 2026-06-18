import { Stack } from '@mui/material';
import { DashboardHeroKpiRow } from '../../components/dashboard/DashboardHeroKpiRow';
import { OperatorDashboardShell } from '../../components/dashboard/OperatorDashboardShell';
import { RecentActivityTimeline } from '../../components/dashboard/RecentActivityTimeline';
import { buildUserHeroKpis } from '../../lib/operatorDashboardMetrics';

export function UserDashboardPage() {
  return (
    <OperatorDashboardShell accessDeniedMessage="Access denied. Sign in to view your dashboard.">
      {(metrics) => (
        <Stack spacing={2.5}>
          <DashboardHeroKpiRow metrics={buildUserHeroKpis(metrics)} />
          <RecentActivityTimeline />
        </Stack>
      )}
    </OperatorDashboardShell>
  );
}