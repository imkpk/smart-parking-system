import Grid from '@mui/material/GridLegacy';
import { getHeroKpiIcon } from '../../lib/dashboardHeroKpiConfig';
import { DashboardMetricItem } from '../../lib/operatorDashboardMetrics';
import { StatCard } from '../common/StatCard';

export function DashboardHeroKpiRow({ metrics }: { metrics: DashboardMetricItem[] }) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={2} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      {metrics.slice(0, 4).map((metric) => (
        <Grid item key={metric.key} lg={3} md={6} xs={12}>
          <StatCard
            accentColor={metric.accentColor ?? 'primary.main'}
            compact
            helperText={metric.helperText}
            icon={getHeroKpiIcon(metric.key)}
            iconBgcolor={metric.iconBgcolor ?? 'rgba(31, 111, 235, 0.1)'}
            label={metric.label}
            value={metric.value}
          />
        </Grid>
      ))}
    </Grid>
  );
}