import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Card, CardContent, Stack, Typography, useTheme } from '@mui/material';
import { EmptyState } from '../common/EmptyState';
import { OccupancySummary } from '../../types/operatorDashboard';

const SLOT_STATUS_LABELS = [
  { key: 'availableSlots', label: 'Available', colorKey: 'success' },
  { key: 'occupiedSlots', label: 'Occupied', colorKey: 'error' },
  { key: 'reservedSlots', label: 'Reserved', colorKey: 'warning' },
  { key: 'maintenanceSlots', label: 'Maintenance', colorKey: 'maintenance' },
] as const;

export function SlotStatusDonutChart({ occupancy }: { occupancy: OccupancySummary }) {
  const theme = useTheme();
  const palette = theme.palette;

  const chartData = SLOT_STATUS_LABELS.map((entry, index) => ({
    id: index,
    label: entry.label,
    value: occupancy[entry.key],
    color:
      entry.colorKey === 'maintenance'
        ? palette.grey[600]
        : palette[entry.colorKey].main,
  })).filter((entry) => entry.value > 0);

  const hasData = occupancy.totalSlots > 0 && chartData.length > 0;

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Typography component="h2" variant="h6">
            Slot Status
          </Typography>

          {hasData ? (
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
                minHeight: 168,
              }}
            >
              <PieChart
                height={168}
                width={240}
                series={[
                  {
                    data: chartData,
                    innerRadius: 44,
                    outerRadius: 72,
                    paddingAngle: 2,
                    cornerRadius: 4,
                    highlightScope: { fade: 'global', highlight: 'item' },
                  },
                ]}
                slotProps={{
                  legend: {
                    direction: 'horizontal',
                    position: { vertical: 'bottom', horizontal: 'center' },
                  },
                }}
              />
            </Box>
          ) : (
            <EmptyState
              description="Slot status will appear once parking inventory is configured."
              illustration="empty"
              title="No slot data yet"
            />
          )}

          {hasData ? (
            <Typography color="text.secondary" textAlign="center" variant="caption">
              {occupancy.totalSlots} total slots across the lot
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}