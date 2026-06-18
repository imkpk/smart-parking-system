import { MouseEvent } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Card, CardContent, Fade, Stack, Typography, useTheme } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getParkingLots } from '../../api/parkingLotsApi';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { DonutChartRevealSkeleton } from './ChartRevealSkeleton';
import { DONUT_CHART_WIDTH, getResponsiveDonutDimensions } from './donutChartConfig';
import { SlotStatusChartLegend } from './SlotStatusChartLegend';
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
  sx,
}: {
  occupancy: OccupancySummary;
  lotUtilization?: LotUtilizationItem[];
  fallbackParkingLotId?: number | null;
  sx?: SxProps<Theme>;
}) {
  const theme = useTheme();
  const palette = theme.palette;
  const navigate = useNavigate();
  const { animationKey, isActive, ref, replay } = useScrollReveal();
  const { ref: chartContainerRef, width: chartContainerWidth } = useContainerWidth(DONUT_CHART_WIDTH);
  const donut = getResponsiveDonutDimensions(chartContainerWidth);

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

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button, [role="button"], path')) {
      return;
    }

    replay();
  };

  return (
    <Card
      elevation={0}
      onClick={handleCardClick}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'default',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        width: '100%',
        ...sx,
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Typography component="h2" variant="h6">
            Slot Status
          </Typography>

          {hasData ? (
            <Box
              ref={(node: HTMLDivElement | null) => {
                chartContainerRef.current = node;
                ref.current = node;
              }}
              sx={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
                maxWidth: '100%',
                minWidth: 0,
                mx: 'auto',
                width: '100%',
              }}
            >
              {!isActive ? <DonutChartRevealSkeleton containerWidth={chartContainerWidth} /> : null}
              <Fade in={isActive} timeout={500}>
                <Stack
                  alignItems="center"
                  spacing={1}
                  sx={{
                    display: isActive ? 'flex' : 'none',
                    maxWidth: '100%',
                    minWidth: 0,
                    width: '100%',
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      maxWidth: '100%',
                      position: 'relative',
                    }}
                  >
                    <PieChart
                      key={`${animationKey}-${donut.width}`}
                      height={donut.pieHeight}
                      hideLegend
                      skipAnimation={false}
                      width={donut.width}
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
                          innerRadius: donut.innerRadius,
                          outerRadius: donut.outerRadius,
                          paddingAngle: 2,
                          cornerRadius: 4,
                          highlightScope: { fade: 'global', highlight: 'item' },
                        },
                      ]}
                      slotProps={{
                        pieArc: {
                          style: {
                            cursor: 'pointer',
                          },
                        },
                      }}
                    />
                    <Stack
                      alignItems="center"
                      aria-hidden
                      justifyContent="center"
                      spacing={0.25}
                      sx={{
                        inset: 0,
                        pointerEvents: 'none',
                        position: 'absolute',
                      }}
                    >
                      <Typography
                        component="p"
                        sx={{
                          fontSize: { xs: '1.25rem', sm: '1.4rem' },
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                        }}
                      >
                        {occupancy.utilizationPercent}%
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Utilized
                      </Typography>
                    </Stack>
                  </Box>
                  <SlotStatusChartLegend
                    items={chartData.map((segment) => ({
                      color: segment.color,
                      label: segment.label,
                    }))}
                    onItemClick={handleStatusNavigate}
                  />
                </Stack>
              </Fade>
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
              {occupancy.totalSlots} total slots · click a segment or legend item to filter
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}