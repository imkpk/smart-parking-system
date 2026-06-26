import { Alert, Avatar, CircularProgress, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { getOperatorMetrics } from '../../api/dashboardApi';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { DASHBOARD_QUERY_STALE_MS } from '../../lib/dashboardQueryOptions';
import { useTenantBranding } from '../../providers/TenantBrandingProvider';
import { OperatorDashboardMetrics } from '../../types/operatorDashboard';
import { PageHeader } from '../common/PageHeader';

/** Subtitle to first dashboard row — keep within ~24px. */
const DASHBOARD_HEADER_CONTENT_GAP = 2;
/** Vertical gap between dashboard sections (KPI row, charts, activity). */
const DASHBOARD_SECTION_GAP = 2.5;

export function OperatorDashboardShell({
  title = 'Dashboard',
  accessDeniedMessage = 'Access denied. You do not have permission to view this dashboard.',
  topContent,
  children,
}: {
  title?: string;
  accessDeniedMessage?: string;
  topContent?: ReactNode;
  children: (metrics: OperatorDashboardMetrics) => ReactNode;
}) {
  const { branding } = useTenantBranding();
  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'operator-metrics'],
    queryFn: getOperatorMetrics,
    staleTime: DASHBOARD_QUERY_STALE_MS,
  });

  const metrics = metricsQuery.data;

  const description = metrics
    ? metrics.scope === 'PLATFORM'
      ? 'Platform-wide parking operations overview'
      : `Overview for ${metrics.organizationName ?? branding.name}`
    : undefined;

  return (
    <Stack spacing={0} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      <PageHeader
        compact
        description={description}
        sx={{ mb: DASHBOARD_HEADER_CONTENT_GAP }}
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

      {topContent ? (
        <Stack spacing={DASHBOARD_SECTION_GAP} sx={{ mb: DASHBOARD_SECTION_GAP, maxWidth: '100%', minWidth: 0, width: '100%' }}>
          {topContent}
        </Stack>
      ) : null}

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

      {metrics ? (
        <Stack spacing={DASHBOARD_SECTION_GAP} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
          {children(metrics)}
        </Stack>
      ) : null}
    </Stack>
  );
}