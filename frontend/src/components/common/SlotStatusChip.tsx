import { SlotStatus } from '../../types/slot';
import { StatusChip } from './StatusChip';

export function SlotStatusChip({ status }: { status: SlotStatus }) {
  return <StatusChip status={status} />;
}