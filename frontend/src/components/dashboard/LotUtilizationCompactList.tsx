import {
  Box,
  Card,
  CardContent,
  Fade,
  Stack,
  Typography,
} from '@mui/material';
import { MouseEvent } from 'react';
import { SxProps, Theme } from '@mui/material/styles';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { ViewAllActionButton } from './ViewAllActionButton';
import { EmptyState } from '../common/EmptyState';
import { LotUtilizationItem } from '../../types/operatorDashboard';
import {
  AnimatedUtilizationBar,
  useAnimatedNumber,
} from './AnimatedUtilizationBar';
import { UtilizationBarsRevealSkeleton } from './ChartRevealSkeleton';

export const TOP_LOT_COUNT = 5;

const LOT_BAR_COLORS = ['primary', 'success', 'info', 'warning', 'secondary'] as const;

function getLotBarColor(parkingLotId: number) {
  return LOT_BAR_COLORS[parkingLotId % LOT_BAR_COLORS.length];
}

const LOT_BAR_STAGGER_MS = 120;

const lotNameTypographySx = {
  flex: 1,
  fontWeight: 600,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

const lotMetricsTypographySx = {
  flexShrink: 0,
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 500,
  letterSpacing: '0.01em',
} as const;

function AnimatedLotRow({
  index,
  isActive,
  lot,
}: {
  index: number;
  isActive: boolean;
  lot: LotUtilizationItem;
}) {
  const animatedPercent = useAnimatedNumber(lot.utilizationPercent, isActive, {
    delay: index * LOT_BAR_STAGGER_MS,
  });

  return (
    <Box
      component="li"
      sx={{
        borderRadius: 1.5,
        display: 'block',
        listStyle: 'none',
        px: 0.5,
        py: 0.75,
      }}
    >
      <Stack spacing={1}>
        <Stack alignItems="baseline" direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography sx={lotNameTypographySx} variant="subtitle2">
            {`${index + 1}. ${lot.parkingLotName}`}
          </Typography>
          <Typography color="text.secondary" sx={lotMetricsTypographySx} variant="body2">
            {lot.occupiedSlots}/{lot.totalSlots} · {animatedPercent}%
          </Typography>
        </Stack>
        <AnimatedUtilizationBar
          color={getLotBarColor(lot.parkingLotId)}
          delay={index * LOT_BAR_STAGGER_MS}
          isActive={isActive}
          label={`${lot.parkingLotName} utilization`}
          value={lot.utilizationPercent}
        />
      </Stack>
    </Box>
  );
}

export function LotUtilizationCompactList({
  fillHeight = false,
  items,
  showViewAllLink = true,
  sx,
}: {
  fillHeight?: boolean;
  items: LotUtilizationItem[];
  showViewAllLink?: boolean;
  sx?: SxProps<Theme>;
}) {
  const { animationKey, isActive, ref, replay } = useScrollReveal();

  const cardSx: SxProps<Theme> = {
    border: '1px solid',
    borderColor: 'divider',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
    ...(fillHeight
      ? {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          minHeight: 0,
        }
      : {}),
    ...sx,
  };

  if (items.length === 0) {
    return (
      <Card elevation={0} sx={cardSx}>
        <CardContent sx={fillHeight ? { flex: 1 } : undefined}>
          <Typography component="h2" sx={{ mb: 2 }} variant="h6">
            Lot Utilization
          </Typography>
          <EmptyState
            description="Parking lot utilization ranks will appear once lots are active."
            illustration="empty"
            title="No lots to rank yet"
          />
        </CardContent>
      </Card>
    );
  }

  const rankedLots = [...items]
    .sort((left, right) => right.utilizationPercent - left.utilizationPercent)
    .slice(0, TOP_LOT_COUNT);

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button, [role="button"]')) {
      return;
    }

    replay();
  };

  return (
    <Card elevation={0} onClick={handleCardClick} sx={{ ...cardSx, cursor: 'default' }}>
      <CardContent
        sx={{
          py: 2,
          '&:last-child': { pb: 2 },
          display: fillHeight ? 'flex' : undefined,
          flex: fillHeight ? 1 : undefined,
          flexDirection: fillHeight ? 'column' : undefined,
          minHeight: fillHeight ? 0 : undefined,
        }}
      >
        <Stack spacing={1.5} sx={{ flex: fillHeight ? 1 : undefined, minHeight: fillHeight ? 0 : undefined }}>
          <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={2}>
            <Typography component="h2" variant="h6">
              Lot Utilization
            </Typography>
            {showViewAllLink && items.length > rankedLots.length ? (
              <ViewAllActionButton to="/parking-lots">View all lots</ViewAllActionButton>
            ) : null}
          </Stack>

          <Box ref={ref}>
            {!isActive ? <UtilizationBarsRevealSkeleton rows={rankedLots.length} /> : null}
            <Fade in={isActive} timeout={450}>
              <Stack
                aria-label="Top parking lot utilization"
                component="ol"
                key={animationKey}
                spacing={2}
                sx={{ display: isActive ? 'flex' : 'none', m: 0, p: 0 }}
              >
                {rankedLots.map((lot, index) => (
                  <AnimatedLotRow
                    index={index}
                    isActive={isActive}
                    key={lot.parkingLotId}
                    lot={lot}
                  />
                ))}
              </Stack>
            </Fade>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}