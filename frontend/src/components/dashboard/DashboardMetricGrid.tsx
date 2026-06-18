import Grid from '@mui/material/GridLegacy';
import { StatCard } from '../common/StatCard';
import { DashboardMetricItem } from '../../lib/operatorDashboardMetrics';

export function DashboardMetricGrid({ metrics }: { metrics: DashboardMetricItem[] }) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={2}>
      {metrics.map((metric) => (
        <Grid item key={metric.key} lg={3} sm={6} xs={12}>
          <StatCard
            accentColor={metric.accentColor}
            iconBgcolor={metric.iconBgcolor}
            label={metric.label}
            value={metric.value}
          />
        </Grid>
      ))}
    </Grid>
  );
}