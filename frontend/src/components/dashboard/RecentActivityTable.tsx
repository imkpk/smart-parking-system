import {
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatActivityTypeLabel } from '../../lib/operatorDashboardLabels';
import { formatDateTime } from '../../lib/formatters';
import { RecentActivityItem } from '../../types/operatorDashboard';
import { ParkingEventStatusChip } from '../common/ParkingEventStatusChip';

export function RecentActivityTable({ items }: { items: RecentActivityItem[] }) {
  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">
        Recent Activity
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table aria-label="Recent parking activity" size="small">
            <TableHead>
              <TableRow>
                <TableCell>Activity</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Slot</TableCell>
                <TableCell>Parking Lot</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" variant="body2">
                      No recent parking activity.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow hover key={item.parkingEventId}>
                    <TableCell>{formatActivityTypeLabel(item.activityType)}</TableCell>
                    <TableCell>{item.vehicleNumber}</TableCell>
                    <TableCell>{item.slotNumber}</TableCell>
                    <TableCell>{item.parkingLotName}</TableCell>
                    <TableCell>
                      <ParkingEventStatusChip status={item.status} />
                    </TableCell>
                    <TableCell>
                      {formatDateTime(
                        item.activityType === 'CHECK_OUT' ? item.checkOutTime : item.checkInTime,
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}