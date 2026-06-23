import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type PlanLimitUpgradeDialogProps = {
  open: boolean;
  resource?: string;
  onClose: () => void;
};

function formatResourceLabel(resource?: string) {
  switch (resource) {
    case 'parkingLots':
      return 'parking lots';
    case 'users':
      return 'users';
    case 'bookingsThisMonth':
      return 'bookings this month';
    default:
      return 'resources';
  }
}

export function PlanLimitUpgradeDialog({
  open,
  resource,
  onClose,
}: PlanLimitUpgradeDialogProps) {
  return (
    <Dialog fullWidth maxWidth="xs" onClose={onClose} open={open}>
      <DialogTitle>Upgrade required</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          {`You've hit your FREE plan limit. Upgrade your plan to add more ${formatResourceLabel(resource)}.`}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button component={RouterLink} onClick={onClose} to="/settings/billing" variant="contained">
          View Plans
        </Button>
      </DialogActions>
    </Dialog>
  );
}