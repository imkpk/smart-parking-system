import { ParkingLot } from '../types/parkingLot';

export type ParkingLotWorkspaceTab =
  | 'overview'
  | 'visual-map'
  | 'slots'
  | 'floors'
  | 'settings';

export function formatParkingLotLocation(lot: Pick<ParkingLot, 'address' | 'city' | 'state' | 'pincode'>) {
  const cityState = [lot.city, lot.state].filter(Boolean).join(', ');
  const parts = [lot.address, cityState, lot.pincode].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : 'Location not set';
}

export function getParkingLotWorkspacePath(
  parkingLotId: number,
  tab: Exclude<ParkingLotWorkspaceTab, 'visual-map' | 'settings'>,
) {
  if (tab === 'overview') {
    return `/parking-lots/${parkingLotId}`;
  }

  return `/parking-lots/${parkingLotId}/${tab}`;
}

export function getParkingLotVisualMapPath(parkingLotId: number) {
  return `/parking-lots/${parkingLotId}/slot-map`;
}

export function getParkingLotSettingsPath(parkingLotId: number) {
  return `/parking-lots/${parkingLotId}?tab=settings`;
}

export function resolveParkingLotWorkspaceTab(
  pathname: string,
  searchTab: string | null,
): ParkingLotWorkspaceTab {
  if (pathname.endsWith('/slot-map')) {
    return 'visual-map';
  }

  if (searchTab === 'settings') {
    return 'settings';
  }

  if (pathname.endsWith('/floors')) {
    return 'floors';
  }

  if (pathname.endsWith('/slots')) {
    return 'slots';
  }

  return 'overview';
}