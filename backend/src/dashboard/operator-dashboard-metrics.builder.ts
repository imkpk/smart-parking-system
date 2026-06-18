import { BookingStatus, ParkingEventStatus, Role } from '@prisma/client';
import {
  BookingVolumeSummary,
  LotUtilizationItem,
  OccupancySummary,
  OperatorDashboardMetrics,
  ParkingEventSummary,
  PlatformOverview,
  RecentActivityItem,
  RevenueSummary,
  UserOverview,
} from './types/operator-dashboard-metrics.type';

export function buildOccupancySummary(counts: {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
}): OccupancySummary {
  const utilizedSlots = counts.occupiedSlots + counts.reservedSlots;
  const utilizationPercent =
    counts.totalSlots > 0 ? Math.round((utilizedSlots / counts.totalSlots) * 100) : 0;

  return {
    ...counts,
    utilizationPercent,
  };
}

export function buildLotUtilizationItem(
  parkingLotId: number,
  parkingLotName: string,
  slotCounts: {
    totalSlots: number;
    availableSlots: number;
    occupiedSlots: number;
  },
): LotUtilizationItem {
  const utilizationPercent =
    slotCounts.totalSlots > 0
      ? Math.round((slotCounts.occupiedSlots / slotCounts.totalSlots) * 100)
      : 0;

  return {
    parkingLotId,
    parkingLotName,
    totalSlots: slotCounts.totalSlots,
    occupiedSlots: slotCounts.occupiedSlots,
    availableSlots: slotCounts.availableSlots,
    utilizationPercent,
  };
}

export function buildBookingVolumeSummary(
  total: number,
  today: number,
  thisWeek: number,
  statusCounts: Array<{ status: BookingStatus; count: number }>,
): BookingVolumeSummary {
  const countByStatus = (status: BookingStatus) =>
    statusCounts.find((entry) => entry.status === status)?.count ?? 0;

  return {
    total,
    today,
    thisWeek,
    pending: countByStatus(BookingStatus.PENDING),
    confirmed: countByStatus(BookingStatus.CONFIRMED),
    cancelled: countByStatus(BookingStatus.CANCELLED),
  };
}

export function buildParkingEventSummary(
  active: number,
  completed: number,
  checkInsToday: number,
  checkOutsToday: number,
): ParkingEventSummary {
  return {
    active,
    completed,
    checkInsToday,
    checkOutsToday,
  };
}

export function buildRevenueSummary(
  todayCollectedFees: number,
  weekCollectedFees: number,
  monthCollectedFees: number,
): RevenueSummary {
  return {
    todayCollectedFees,
    weekCollectedFees,
    monthCollectedFees,
    currency: 'INR',
  };
}

export function mapRecentActivity(
  events: Array<{
    id: number;
    status: ParkingEventStatus;
    checkInTime: Date;
    checkOutTime: Date | null;
    vehicle: { vehicleNumber: string };
    slot: { slotNumber: string; floor?: { name: string } | null };
    parkingLot: { name: string };
  }>,
): RecentActivityItem[] {
  return events.map((event) => ({
    parkingEventId: event.id,
    vehicleNumber: event.vehicle.vehicleNumber,
    slotNumber: event.slot.slotNumber,
    floorName: event.slot.floor?.name ?? null,
    parkingLotName: event.parkingLot.name,
    status: event.status,
    checkInTime: event.checkInTime,
    checkOutTime: event.checkOutTime,
    activityType:
      event.status === ParkingEventStatus.ACTIVE
        ? 'CHECK_IN'
        : event.checkOutTime
          ? 'CHECK_OUT'
          : 'CHECK_IN',
  }));
}

export function buildOperatorDashboardMetrics(input: {
  scope: OperatorDashboardMetrics['scope'];
  role: Role;
  organizationName: string | null;
  occupancy?: OccupancySummary | null;
  bookings?: BookingVolumeSummary | null;
  parkingEvents?: ParkingEventSummary | null;
  revenue?: RevenueSummary | null;
  recentActivity?: RecentActivityItem[];
  lotUtilization?: LotUtilizationItem[];
  platformOverview?: PlatformOverview | null;
  userOverview?: UserOverview | null;
}): OperatorDashboardMetrics {
  return {
    scope: input.scope,
    role: input.role,
    organizationName: input.organizationName,
    occupancy: input.occupancy ?? null,
    bookings: input.bookings ?? null,
    parkingEvents: input.parkingEvents ?? null,
    revenue: input.revenue ?? null,
    recentActivity: input.recentActivity ?? [],
    lotUtilization: input.lotUtilization ?? [],
    platformOverview: input.platformOverview ?? null,
    userOverview: input.userOverview ?? null,
  };
}

export function decimalToNumber(value: { toNumber?: () => number } | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return value.toNumber?.() ?? Number(value);
}