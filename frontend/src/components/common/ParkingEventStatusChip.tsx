import { ParkingEventStatus } from '../../types/parkingEvent';
import { StatusChip } from './StatusChip';

export function ParkingEventStatusChip({ status }: { status: ParkingEventStatus }) {
  return <StatusChip status={status} />;
}