import { ParkingEventStatus } from '../types/parkingEvent';

export const parkingEventStatusStyles: Record<
  ParkingEventStatus,
  {
    bgcolor: string;
    borderColor: string;
    color: string;
    label: string;
  }
> = {
  ACTIVE: {
    bgcolor: 'rgba(46, 125, 50, 0.12)',
    borderColor: 'success.main',
    color: 'success.dark',
    label: 'Active',
  },
  COMPLETED: {
    bgcolor: 'rgba(25, 118, 210, 0.12)',
    borderColor: 'primary.main',
    color: 'primary.dark',
    label: 'Completed',
  },
  CANCELLED: {
    bgcolor: 'rgba(211, 47, 47, 0.12)',
    borderColor: 'error.main',
    color: 'error.dark',
    label: 'Cancelled',
  },
};
