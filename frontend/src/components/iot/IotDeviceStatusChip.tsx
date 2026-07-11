import { StatusChip } from '../common/StatusChip';
import { IotDeviceStatus } from '../../types/iot';

export function IotDeviceStatusChip({ status }: { status: IotDeviceStatus }) {
  return <StatusChip status={status} />;
}