import { Chip } from '@mui/material';
import { parkingEventStatusStyles } from '../../lib/parkingEventStatusStyles';
import { ParkingEventStatus } from '../../types/parkingEvent';

export function ParkingEventStatusChip({ status }: { status: ParkingEventStatus }) {
  const statusStyle = parkingEventStatusStyles[status];

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
