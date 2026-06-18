import { LotUtilizationItem } from '../types/operatorDashboard';
import { SlotStatus, slotStatusOptions } from '../types/slot';

export const SLOT_STATUS_LABEL_TO_VALUE: Record<string, SlotStatus> = {
  Available: 'AVAILABLE',
  Occupied: 'OCCUPIED',
  Reserved: 'RESERVED',
  Maintenance: 'MAINTENANCE',
};

export function isSlotStatus(value: string | null): value is SlotStatus {
  return value != null && slotStatusOptions.includes(value as SlotStatus);
}

export function slotStatusFromLabel(label: string): SlotStatus | null {
  return SLOT_STATUS_LABEL_TO_VALUE[label] ?? null;
}

export function buildSlotsFilteredPath(parkingLotId: number, status: SlotStatus) {
  return `/parking-lots/${parkingLotId}/slots?status=${status}`;
}

export function resolveParkingLotIdForStatus(
  statusLabel: string,
  lotUtilization: LotUtilizationItem[],
  fallbackParkingLotId: number | null,
): number | null {
  if (lotUtilization.length === 0) {
    return fallbackParkingLotId;
  }

  const pickLotWithHighest = (selector: (lot: LotUtilizationItem) => number) =>
    [...lotUtilization].sort((left, right) => selector(right) - selector(left))[0]?.parkingLotId ??
    fallbackParkingLotId;

  if (statusLabel === 'Available') {
    return pickLotWithHighest((lot) => lot.availableSlots);
  }

  if (statusLabel === 'Occupied') {
    return pickLotWithHighest((lot) => lot.occupiedSlots);
  }

  return pickLotWithHighest((lot) => lot.totalSlots);
}