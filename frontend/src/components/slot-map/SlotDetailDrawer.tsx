import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDateTime, formatStatusLabel } from '../../lib/formatters';
import { formatVehicleNumber } from '../../lib/vehicleNumber';
import { SlotMapSlotItem } from '../../types/slotMap';
import { SlotStatusChip } from '../common/SlotStatusChip';
import { StatusChip } from '../common/StatusChip';

export function SlotDetailDrawer({
  onClose,
  open,
  slot,
}: {
  onClose: () => void;
  open: boolean;
  slot: SlotMapSlotItem | null;
}) {
  return (
    <Drawer anchor="right" onClose={onClose} open={open} sx={{ zIndex: (theme) => theme.zIndex.drawer + 3 }}>
      <Box sx={{ maxWidth: 360, p: 2.5, width: { xs: '100vw', sm: 360 } }}>
        {slot ? (
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography component="h2" variant="h6">
                Slot {slot.displayLabel}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {slot.floorName}
                {slot.floorLevel != null ? ` · Level ${slot.floorLevel}` : ''}
              </Typography>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {slot.status === 'UNKNOWN' ? (
                <StatusChip status="UNKNOWN" />
              ) : (
                <SlotStatusChip status={slot.status} />
              )}
              <StatusChip status={slot.slotType} />
            </Stack>

            {slot.occupancy ? (
              <>
                <Divider />
                <Stack spacing={1}>
                  <Typography fontWeight={600} variant="subtitle2">
                    Current activity
                  </Typography>
                  <Typography variant="body2">
                    State: {formatStatusLabel(slot.occupancy.state)}
                  </Typography>
                  {slot.occupancy.vehicleNumber ? (
                    <Typography variant="body2">
                      Vehicle: {formatVehicleNumber(slot.occupancy.vehicleNumber)}
                    </Typography>
                  ) : null}
                  {slot.occupancy.bookingCode ? (
                    <Typography variant="body2">Booking: {slot.occupancy.bookingCode}</Typography>
                  ) : null}
                  {slot.occupancy.checkedInAt ? (
                    <Typography color="text.secondary" variant="caption">
                      Checked in {formatDateTime(slot.occupancy.checkedInAt)}
                    </Typography>
                  ) : null}
                </Stack>
              </>
            ) : null}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {slot.occupancy?.bookingId ? (
                <Button component={RouterLink} size="small" to="/bookings" variant="outlined">
                  View bookings
                </Button>
              ) : null}
              {slot.occupancy?.eventId ? (
                <Button component={RouterLink} size="small" to="/parking-events" variant="outlined">
                  View parking events
                </Button>
              ) : null}
              <Button onClick={onClose} size="small" variant="text">
                Close
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}