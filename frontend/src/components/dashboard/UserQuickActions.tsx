import { Button, Stack } from '@mui/material';
import { DirectionsCar, EventAvailable } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DashboardQuickActionsPanel } from './DashboardQuickActionsPanel';

export function UserQuickActions() {
  const navigate = useNavigate();

  return (
    <DashboardQuickActionsPanel>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          onClick={() => navigate('/vehicles?create=1')}
          size="small"
          startIcon={<DirectionsCar />}
          variant="outlined"
        >
          Add Vehicle
        </Button>
        <Button
          onClick={() => navigate('/bookings?create=1')}
          size="small"
          startIcon={<EventAvailable />}
          variant="outlined"
        >
          Book Slot
        </Button>
      </Stack>
    </DashboardQuickActionsPanel>
  );
}