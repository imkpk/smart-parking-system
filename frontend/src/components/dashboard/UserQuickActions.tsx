import DirectionsCar from '@mui/icons-material/DirectionsCar';
import EventAvailable from '@mui/icons-material/EventAvailable';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { statusStyles } from '../../lib/statusStyles';
import { DashboardQuickActionGrid, DashboardQuickActionGridItem } from './DashboardQuickActionGrid';
import { DashboardQuickActionsPanel } from './DashboardQuickActionsPanel';

export function UserQuickActions() {
  const navigate = useNavigate();

  const actions = useMemo<DashboardQuickActionGridItem[]>(
    () => [
      {
        id: 'add-vehicle',
        title: 'Add Vehicle',
        description: 'Register your vehicle to book parking.',
        ctaLabel: 'Add vehicle',
        icon: <DirectionsCar />,
        accentColor: statusStyles.CONFIRMED.borderColor,
        iconBgcolor: statusStyles.CONFIRMED.bgcolor,
        onClick: () => navigate('/vehicles?create=1'),
      },
      {
        id: 'book-slot',
        title: 'Book Slot',
        description: 'Reserve an available parking slot.',
        ctaLabel: 'Book slot',
        icon: <EventAvailable />,
        accentColor: statusStyles.RESERVED.borderColor,
        iconBgcolor: statusStyles.RESERVED.bgcolor,
        onClick: () => navigate('/bookings?create=1'),
      },
    ],
    [navigate],
  );

  return (
    <DashboardQuickActionsPanel description="Get started with your parking in two quick steps.">
      <DashboardQuickActionGrid actions={actions} />
    </DashboardQuickActionsPanel>
  );
}