import Login from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { statusStyles } from '../../lib/statusStyles';
import { DashboardQuickActionGrid, DashboardQuickActionGridItem } from './DashboardQuickActionGrid';
import { DashboardQuickActionsPanel } from './DashboardQuickActionsPanel';

export function SecurityQuickActions() {
  const navigate = useNavigate();

  const actions = useMemo<DashboardQuickActionGridItem[]>(
    () => [
      {
        id: 'check-in-vehicle',
        title: 'Check In Vehicle',
        description: 'Search booking or vehicle and start parking session.',
        ctaLabel: 'Check in vehicle',
        icon: <Login />,
        accentColor: statusStyles.ACTIVE.borderColor,
        iconBgcolor: statusStyles.ACTIVE.bgcolor,
        onClick: () => navigate('/security/gate'),
      },
      {
        id: 'check-out-vehicle',
        title: 'Check Out Vehicle',
        description: 'Find an active session and complete checkout.',
        ctaLabel: 'Check out vehicle',
        icon: <Logout />,
        accentColor: statusStyles.COMPLETED.borderColor,
        iconBgcolor: statusStyles.COMPLETED.bgcolor,
        onClick: () => navigate('/parking-events'),
      },
    ],
    [navigate],
  );

  return (
    <DashboardQuickActionsPanel description="Gate operations for arrivals and departures.">
      <DashboardQuickActionGrid actions={actions} />
    </DashboardQuickActionsPanel>
  );
}