import { Box, Button, Stack, Typography } from '@mui/material';
import { SlotMapSlotItem } from '../../types/slotMap';
import { formatStatusLabel } from '../../lib/formatters';
import { getStatusStyle } from '../../lib/statusStyles';
import { SlotStatusChip } from '../common/SlotStatusChip';
import { StatusChip } from '../common/StatusChip';
import { SlotType } from '../../types/slot';

const SLOT_TYPE_MARKERS: Record<SlotType, string> = {
  CAR: 'Car',
  BIKE: 'Bike',
  EV: 'EV',
  HANDICAPPED: 'A11y',
};

function SlotTypeMarker({ slotType }: { slotType: SlotType }) {
  return (
    <Typography
      aria-hidden
      color="text.secondary"
      component="span"
      sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em' }}
    >
      {SLOT_TYPE_MARKERS[slotType]}
    </Typography>
  );
}

export function SlotMapCard({
  isSelected,
  onSelect,
  slot,
}: {
  isSelected: boolean;
  onSelect: (slot: SlotMapSlotItem) => void;
  slot: SlotMapSlotItem;
}) {
  const statusStyle = getStatusStyle(slot.status);
  const statusLabel =
    slot.status === 'UNKNOWN' ? 'Unknown' : formatStatusLabel(slot.status);

  return (
    <Button
      aria-label={`${slot.displayLabel}, ${statusLabel}, ${formatStatusLabel(slot.slotType)}`}
      aria-pressed={isSelected}
      onClick={() => onSelect(slot)}
      sx={{
        alignItems: 'stretch',
        bgcolor: statusStyle.bgcolor,
        border: '2px solid',
        borderColor: isSelected ? 'primary.main' : statusStyle.borderColor,
        borderRadius: 1.5,
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        minHeight: 96,
        p: 1.25,
        textAlign: 'left',
        textTransform: 'none',
        width: '100%',
        '&:hover': {
          bgcolor: statusStyle.bgcolor,
          borderColor: isSelected ? 'primary.main' : 'primary.light',
        },
      }}
      variant="outlined"
    >
      <Stack spacing={0.75} sx={{ width: '100%' }}>
        <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={0.5}>
          <Typography fontWeight={700} noWrap variant="body2">
            {slot.displayLabel}
          </Typography>
          <SlotTypeMarker slotType={slot.slotType} />
        </Stack>
        {slot.status === 'UNKNOWN' ? (
          <StatusChip status="UNKNOWN" />
        ) : (
          <SlotStatusChip status={slot.status} />
        )}
      </Stack>
    </Button>
  );
}