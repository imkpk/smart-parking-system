import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { EmptyState } from '../common/EmptyState';
import { LotUtilizationItem } from '../../types/operatorDashboard';

const TOP_LOT_COUNT = 5;

export function LotUtilizationCompactList({
  items,
  showViewAllLink = true,
}: {
  items: LotUtilizationItem[];
  showViewAllLink?: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
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

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={2}>
            <Typography component="h2" variant="h6">
              Lot Utilization
            </Typography>
            {showViewAllLink && items.length > rankedLots.length ? (
              <Link component={RouterLink} to="/parking-lots" underline="hover" variant="body2">
                View all lots
              </Link>
            ) : null}
          </Stack>

          <Stack aria-label="Top parking lot utilization" component="ol" spacing={1.75} sx={{ m: 0, p: 0 }}>
            {rankedLots.map((lot, index) => (
              <Box
                component="li"
                key={lot.parkingLotId}
                sx={{ display: 'block', listStyle: 'none' }}
              >
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography fontWeight={600} variant="body2">
                      {index + 1}. {lot.parkingLotName}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {lot.occupiedSlots}/{lot.totalSlots} · {lot.utilizationPercent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    aria-label={`${lot.parkingLotName} utilization`}
                    sx={{ borderRadius: 1, height: 8 }}
                    value={Math.min(lot.utilizationPercent, 100)}
                    variant="determinate"
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}