import { StatusChip } from '../common/StatusChip';
import { GateAccessDecision } from '../../types/iot';

export function GateAccessDecisionChip({ decision }: { decision: GateAccessDecision }) {
  return <StatusChip status={decision} />;
}