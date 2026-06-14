import { SlotStatus } from '../types/slot';

export const slotStatusStyles: Record<
  SlotStatus,
  {
    bgcolor: string;
    borderColor: string;
    color: string;
    label: string;
  }
> = {
  AVAILABLE: {
    bgcolor: 'rgba(46, 125, 50, 0.12)',
    borderColor: 'success.main',
    color: 'success.dark',
    label: 'Available',
  },
  OCCUPIED: {
    bgcolor: 'rgba(211, 47, 47, 0.12)',
    borderColor: 'error.main',
    color: 'error.dark',
    label: 'Occupied',
  },
  RESERVED: {
    bgcolor: 'rgba(237, 108, 2, 0.14)',
    borderColor: 'warning.main',
    color: 'warning.dark',
    label: 'Reserved',
  },
  MAINTENANCE: {
    bgcolor: 'rgba(97, 97, 97, 0.14)',
    borderColor: 'grey.600',
    color: 'text.secondary',
    label: 'Maintenance',
  },
};
