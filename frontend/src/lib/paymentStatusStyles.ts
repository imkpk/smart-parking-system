import { ChipProps } from '@mui/material';
import { PaymentStatus } from '../types/payment';

export const paymentStatusStyles: Record<
  PaymentStatus,
  { color: ChipProps['color']; label: string }
> = {
  INITIATED: { color: 'warning', label: 'Initiated' },
  SUCCESS: { color: 'success', label: 'Success' },
  FAILED: { color: 'error', label: 'Failed' },
  REFUNDED: { color: 'info', label: 'Refunded' },
};
