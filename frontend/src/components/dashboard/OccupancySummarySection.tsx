import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { OccupancySummary } from '../../types/operatorDashboard';
import { DashboardMetricGrid } from './DashboardMetricGrid';
import { buildOccupancyMetrics } from '../../lib/operatorDashboardMetrics';

export function OccupancySummarySection({ occupancy }: { occupancy: OccupancySummary }) {
  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">
        Occupancy Summary
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography color="text.secondary" fontWeight={600} variant="body2">
                Overall Utilization
              </Typography>
              <Typography fontWeight={700} variant="body2">
                {occupancy.utilizationPercent}%
              </Typography>
            </Stack>
            <LinearProgress
              aria-label="Overall slot utilization"
              sx={{ borderRadius: 1, height: 8 }}
              value={Math.min(occupancy.utilizationPercent, 100)}
              variant="determinate"
            />
            <Typography color="text.secondary" variant="caption">
              {occupancy.occupiedSlots + occupancy.reservedSlots} of {occupancy.totalSlots} slots in
              use or reserved
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <DashboardMetricGrid metrics={buildOccupancyMetrics(occupancy)} />
      </Box>
    </Stack>
  );
}