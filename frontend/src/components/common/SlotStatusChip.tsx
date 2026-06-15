import { Chip } from '@mui/material';
import { slotStatusStyles } from '../../lib/slotStatusStyles';
import { SlotStatus } from '../../types/slot';

export function SlotStatusChip({ status }: { status: SlotStatus }) {
  const statusStyle = slotStatusStyles[status];

  return (
    <Chip
      label={statusStyle.label}
      size="small"
      sx={{
        bgcolor: statusStyle.bgcolor,
        border: '1px solid',
        borderColor: statusStyle.borderColor,
        color: statusStyle.color,
        fontWeight: 700,
      }}
    />
  );
}
