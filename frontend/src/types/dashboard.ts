export interface AdminSummary {
  totalUsers: number;
  totalParkingLots: number;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  totalBookings: number;
  activeParkingEvents: number;
  completedParkingEvents: number;
}

export interface DashboardOnboardingStatus {
  hasLot: boolean;
  hasFloor: boolean;
  hasSlot: boolean;
  hasTeamAccess: boolean;
  firstLotId: number | null;
  firstLotWithFloorsId: number | null;
}

export interface SlotStatusSummary {
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
}
