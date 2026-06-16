import { BookingStatus } from '../../types/booking';
import { StatusChip } from './StatusChip';

export function BookingStatusChip({ status }: { status: BookingStatus }) {
  return <StatusChip status={status} />;
}