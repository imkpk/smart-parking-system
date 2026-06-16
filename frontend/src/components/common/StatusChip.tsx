import { Chip } from '@mui/material';
import { formatStatusLabel } from '../../lib/formatters';
import { getStatusStyle } from '../../lib/statusStyles';

export function StatusChip({ status }: { status: string }) {
  const statusStyle = getStatusStyle(status);

  return (
    <Chip
      label={formatStatusLabel(status)}
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