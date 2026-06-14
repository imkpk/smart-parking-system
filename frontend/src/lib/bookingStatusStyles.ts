import { BookingStatus } from '../types/booking';

export const bookingStatusStyles: Record<
  BookingStatus,
  {
    bgcolor: string;
    borderColor: string;
    color: string;
    label: string;
  }
> = {
  PENDING: {
    bgcolor: 'rgba(2, 136, 209, 0.12)',
    borderColor: 'info.main',
    color: 'info.dark',
    label: 'Pending',
  },
  CONFIRMED: {
    bgcolor: 'rgba(46, 125, 50, 0.12)',
    borderColor: 'success.main',
    color: 'success.dark',
    label: 'Confirmed',
  },
  CANCELLED: {
    bgcolor: 'rgba(211, 47, 47, 0.12)',
    borderColor: 'error.main',
    color: 'error.dark',
    label: 'Cancelled',
  },
  COMPLETED: {
    bgcolor: 'rgba(25, 118, 210, 0.12)',
    borderColor: 'primary.main',
    color: 'primary.dark',
    label: 'Completed',
  },
  EXPIRED: {
    bgcolor: 'rgba(97, 97, 97, 0.14)',
    borderColor: 'grey.600',
    color: 'text.secondary',
    label: 'Expired',
  },
};
