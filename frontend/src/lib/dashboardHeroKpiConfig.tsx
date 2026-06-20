import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PaymentsIcon from '@mui/icons-material/Payments';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import { ReactNode } from 'react';

const HERO_KPI_ICONS: Record<string, ReactNode> = {
  'hero-utilization': <PieChartOutlineIcon sx={{ fontSize: 20 }} />,
  'hero-active-sessions': <DirectionsCarIcon sx={{ fontSize: 20 }} />,
  'hero-check-ins-today': <LoginIcon sx={{ fontSize: 20 }} />,
  'hero-revenue-today': <PaymentsIcon sx={{ fontSize: 20 }} />,
  'hero-check-outs-today': <LogoutIcon sx={{ fontSize: 20 }} />,
  'hero-reserved-slots': <LocalParkingIcon sx={{ fontSize: 20 }} />,
  'bookings-pending': <EventAvailableIcon sx={{ fontSize: 20 }} />,
  organizations: <BusinessIcon sx={{ fontSize: 20 }} />,
  users: <GroupsIcon sx={{ fontSize: 20 }} />,
  lots: <LocalParkingIcon sx={{ fontSize: 20 }} />,
  slots: <AccountBalanceIcon sx={{ fontSize: 20 }} />,
  vehicles: <DirectionsCarIcon sx={{ fontSize: 20 }} />,
  'upcoming-bookings': <EventAvailableIcon sx={{ fontSize: 20 }} />,
  'active-events': <LocalParkingIcon sx={{ fontSize: 20 }} />,
  'completed-events': <LogoutIcon sx={{ fontSize: 20 }} />,
};

export function getHeroKpiIcon(key: string): ReactNode | undefined {
  return HERO_KPI_ICONS[key];
}