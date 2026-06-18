import { BookingStatus, ParkingEventStatus, Role } from '@prisma/client';

export type DashboardScope = 'PLATFORM' | 'TENANT' | 'USER';

export interface OccupancySummary {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  utilizationPercent: number;
}

export interface BookingVolumeSummary {
  total: number;
  today: number;
  thisWeek: number;
  pending: number;
  confirmed: number;
  cancelled: number;
}

export interface ParkingEventSummary {
  active: number;
  completed: number;
  checkInsToday: number;
  checkOutsToday: number;
}

export interface RevenueSummary {
  todayCollectedFees: number;
  weekCollectedFees: number;
  monthCollectedFees: number;
  currency: 'INR';
}

export interface RecentActivityItem {
  parkingEventId: number;
  vehicleNumber: string;
  slotNumber: string;
  floorName: string | null;
  parkingLotName: string;
  status: ParkingEventStatus;
  checkInTime: Date;
  checkOutTime: Date | null;
  activityType: 'CHECK_IN' | 'CHECK_OUT';
}

export interface LotUtilizationItem {
  parkingLotId: number;
  parkingLotName: string;
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  utilizationPercent: number;
}

export interface PlatformOverview {
  totalOrganizations: number;
  totalUsers: number;
  totalParkingLots: number;
  totalSlots: number;
}

export interface UserOverview {
  totalVehicles: number;
  upcomingBookings: number;
  activeParkingEvents: number;
  completedParkingEvents: number;
}

export interface OperatorDashboardMetrics {
  scope: DashboardScope;
  role: Role;
  organizationName: string | null;
  occupancy: OccupancySummary | null;
  bookings: BookingVolumeSummary | null;
  parkingEvents: ParkingEventSummary | null;
  revenue: RevenueSummary | null;
  recentActivity: RecentActivityItem[];
  lotUtilization: LotUtilizationItem[];
  platformOverview: PlatformOverview | null;
  userOverview: UserOverview | null;
}

export interface BookingStatusCount {
  status: BookingStatus;
  count: number;
}