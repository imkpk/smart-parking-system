import { PaymentStatus } from '../../types/payment';
import { StatusChip } from './StatusChip';

export function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  return <StatusChip status={status} />;
}