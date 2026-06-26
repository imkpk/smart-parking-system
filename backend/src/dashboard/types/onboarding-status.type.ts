export type DashboardOnboardingStatus = {
  hasLot: boolean;
  hasFloor: boolean;
  hasSlot: boolean;
  hasTeamAccess: boolean;
  firstLotId: number | null;
  firstLotWithFloorsId: number | null;
};