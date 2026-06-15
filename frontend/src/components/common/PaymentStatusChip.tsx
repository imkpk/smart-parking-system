import { Chip } from '@mui/material';
import { paymentStatusStyles } from '../../lib/paymentStatusStyles';
import { PaymentStatus } from '../../types/payment';

export function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  const style = paymentStatusStyles[status];

  return <Chip color={style.color} label={style.label} size="small" variant="outlined" />;
}
