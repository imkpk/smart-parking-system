import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Card, CardContent, Stack, Typography, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getParkingLots } from '../../api/parkingLotsApi';
import {
  buildSlotsFilteredPath,
  resolveParkingLotIdForStatus,
  slotStatusFromLabel,
} from '../../lib/slotStatusNavigation';
import { LotUtilizationItem, OccupancySummary } from '../../types/operatorDashboard';
import { EmptyState } from '../common/EmptyState';

const SLOT_STATUS_LABELS = [
  { key: 'availableSlots', label: 'Available', colorKey: 'success' },
  { key: 'occupiedSlots', label: 'Occupied', colorKey: 'error' },
  { key: 'reservedSlots', label: 'Reserved', colorKey: 'warning' },
  { key: 'maintenanceSlots', label: 'Maintenance', colorKey: 'maintenance' },
] as const;

export function SlotStatusDonutChart({
  occupancy,
  lotUtilization = [],
  fallbackParkingLotId = null,
}: {
  occupancy: OccupancySummary;
  lotUtilization?: LotUtilizationItem[];
  fallbackParkingLotId?: number | null;
}) {
  const theme = useTheme();
  const palette = theme.palette;
  const navigate = useNavigate();

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
    enabled: lotUtilization.length === 0 && fallbackParkingLotId == null,
  });

  const resolvedFallbackParkingLotId =
    fallbackParkingLotId ?? parkingLotsQuery.data?.[0]?.id ?? null;

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

  const handleStatusNavigate = (statusLabel: string) => {
    const status = slotStatusFromLabel(statusLabel);

    if (!status) {
      return;
    }

    const parkingLotId = resolveParkingLotIdForStatus(
      statusLabel,
      lotUtilization,
      resolvedFallbackParkingLotId,
    );

    if (parkingLotId == null) {
      return;
    }

    navigate(buildSlotsFilteredPath(parkingLotId, status));
  };

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
                '& .MuiChartsLegend-root': {
                  cursor: 'pointer',
                },
              }}
            >
              <PieChart
                height={168}
                width={240}
                onItemClick={(_event, item) => {
                  const dataIndex = (item as { dataIndex?: number }).dataIndex;

                  if (typeof dataIndex !== 'number') {
                    return;
                  }

                  const segment = chartData[dataIndex];

                  if (segment) {
                    handleStatusNavigate(segment.label);
                  }
                }}
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
                    onItemClick: (
                      _event: unknown,
                      _legendItem: unknown,
                      index: number,
                    ) => {
                      const segment = chartData[index];

                      if (segment) {
                        handleStatusNavigate(segment.label);
                      }
                    },
                  },
                  pieArc: {
                    style: {
                      cursor: 'pointer',
                    },
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
            <Stack spacing={0.25}>
              <Typography color="text.secondary" textAlign="center" variant="caption">
                {occupancy.totalSlots} total slots across the lot
              </Typography>
              <Typography color="text.secondary" textAlign="center" variant="caption">
                Click a segment to view matching slots
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}