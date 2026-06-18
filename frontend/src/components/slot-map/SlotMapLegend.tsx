import { Stack, Typography } from '@mui/material';
import { SlotMapLegend as SlotMapLegendCounts } from '../../types/slotMap';
import { SlotStatusChip } from '../common/SlotStatusChip';
import { StatusChip } from '../common/StatusChip';

const LEGEND_ORDER = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'UNKNOWN'] as const;

export function SlotMapLegend({ legend }: { legend: SlotMapLegendCounts }) {
  return (
    <Stack
      alignItems={{ xs: 'stretch', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      flexWrap="wrap"
      gap={1}
      useFlexGap
    >
      <Typography color="text.secondary" fontWeight={600} variant="body2">
        Legend
      </Typography>
      {LEGEND_ORDER.map((status) =>
        legend[status] > 0 ? (
          <Stack alignItems="center" direction="row" key={status} spacing={0.75}>
            {status === 'UNKNOWN' ? (
              <StatusChip status="UNKNOWN" />
            ) : (
              <SlotStatusChip status={status} />
            )}
            <Typography color="text.secondary" variant="caption">
              {legend[status]}
            </Typography>
          </Stack>
        ) : null,
      )}
    </Stack>
  );
}