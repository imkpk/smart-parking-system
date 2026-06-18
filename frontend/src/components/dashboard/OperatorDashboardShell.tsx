import { Alert, Avatar, CircularProgress, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { getOperatorMetrics } from '../../api/dashboardApi';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { useTenantBranding } from '../../providers/TenantBrandingProvider';
import { OperatorDashboardMetrics } from '../../types/operatorDashboard';
import { PageHeader } from '../common/PageHeader';

export function OperatorDashboardShell({
  title = 'Dashboard',
  accessDeniedMessage = 'Access denied. You do not have permission to view this dashboard.',
  children,
}: {
  title?: string;
  accessDeniedMessage?: string;
  children: (metrics: OperatorDashboardMetrics) => ReactNode;
}) {
  const { branding } = useTenantBranding();
  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'operator-metrics'],
    queryFn: getOperatorMetrics,
  });

  const metrics = metricsQuery.data;

  const description = metrics
    ? metrics.scope === 'PLATFORM'
      ? 'Platform-wide parking operations overview'
      : `Overview for ${metrics.organizationName ?? branding.name}`
    : undefined;

  return (
    <Stack spacing={3} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      <PageHeader
        description={description}
        title={title}
        action={
          branding.logoUrl ? (
            <Avatar
              alt={`${metrics?.organizationName ?? branding.name} logo`}
              src={branding.logoUrl}
              sx={{ height: 40, width: 40 }}
              variant="rounded"
            />
          ) : null
        }
      />

      {metricsQuery.isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {metricsQuery.error ? (
        <Alert severity={isForbiddenError(metricsQuery.error) ? 'warning' : 'error'}>
          {isForbiddenError(metricsQuery.error)
            ? accessDeniedMessage
            : getApiErrorMessage(metricsQuery.error, 'Could not load dashboard metrics.')}
        </Alert>
      ) : null}

      {metrics ? children(metrics) : null}
    </Stack>
  );
}