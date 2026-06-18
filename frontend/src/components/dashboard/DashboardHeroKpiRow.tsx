import Grid from '@mui/material/GridLegacy';
import { DashboardMetricItem } from '../../lib/operatorDashboardMetrics';
import { StatCard } from '../common/StatCard';

export function DashboardHeroKpiRow({ metrics }: { metrics: DashboardMetricItem[] }) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={2}>
      {metrics.slice(0, 4).map((metric) => (
        <Grid item key={metric.key} lg={3} md={6} xs={12}>
          <StatCard
            accentColor={metric.accentColor}
            compact
            iconBgcolor={metric.iconBgcolor}
            label={metric.label}
            value={metric.value}
          />
        </Grid>
      ))}
    </Grid>
  );
}