import {
  Card,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { LotUtilizationItem } from '../../types/operatorDashboard';

export function LotUtilizationSection({ items }: { items: LotUtilizationItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">
        Lot Utilization
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table aria-label="Parking lot utilization" size="small">
            <TableHead>
              <TableRow>
                <TableCell>Parking Lot</TableCell>
                <TableCell align="right">Total Slots</TableCell>
                <TableCell align="right">Occupied</TableCell>
                <TableCell align="right">Available</TableCell>
                <TableCell>Utilization</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((lot) => (
                <TableRow hover key={lot.parkingLotId}>
                  <TableCell>{lot.parkingLotName}</TableCell>
                  <TableCell align="right">{lot.totalSlots}</TableCell>
                  <TableCell align="right">{lot.occupiedSlots}</TableCell>
                  <TableCell align="right">{lot.availableSlots}</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Stack alignItems="center" direction="row" spacing={1.5}>
                      <LinearProgress
                        aria-label={`${lot.parkingLotName} utilization`}
                        sx={{ borderRadius: 1, flex: 1, height: 8 }}
                        value={Math.min(lot.utilizationPercent, 100)}
                        variant="determinate"
                      />
                      <Typography fontWeight={600} sx={{ minWidth: 40 }} variant="body2">
                        {lot.utilizationPercent}%
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}