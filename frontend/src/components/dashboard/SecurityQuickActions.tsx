import { Button, Stack } from '@mui/material';
import { Login, Logout } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DashboardQuickActionsPanel } from './DashboardQuickActionsPanel';

export function SecurityQuickActions() {
  const navigate = useNavigate();

  return (
    <DashboardQuickActionsPanel>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          onClick={() => navigate('/security/gate')}
          size="small"
          startIcon={<Login />}
          variant="outlined"
        >
          Check In Vehicle
        </Button>
        <Button
          onClick={() => navigate('/parking-events')}
          size="small"
          startIcon={<Logout />}
          variant="outlined"
        >
          Check Out Vehicle
        </Button>
      </Stack>
    </DashboardQuickActionsPanel>
  );
}