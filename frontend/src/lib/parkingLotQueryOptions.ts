import { ParkingLotWorkspaceTab } from './parkingLotWorkspace';

/** Shared React Query cache window for parking lot workspace (reduces tab-switch refetches). */
export const PARKING_LOT_QUERY_STALE_MS = 30_000;

export function parkingLotWorkspaceNeedsFloors(tab: ParkingLotWorkspaceTab): boolean {
  return tab !== 'settings';
}

export function parkingLotWorkspaceNeedsSlots(tab: ParkingLotWorkspaceTab): boolean {
  return tab !== 'settings';
}