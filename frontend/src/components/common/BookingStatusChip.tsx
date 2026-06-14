import { Chip } from '@mui/material';
import { bookingStatusStyles } from '../../lib/bookingStatusStyles';
import { BookingStatus } from '../../types/booking';

export function BookingStatusChip({ status }: { status: BookingStatus }) {
  const statusStyle = bookingStatusStyles[status];

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
