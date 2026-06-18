import { formatRupees } from './formatters';
import { statusStyles } from './statusStyles';
import { OperatorDashboardMetrics } from '../types/operatorDashboard';

export type DashboardMetricItem = {
  key: string;
  label: string;
  value: number | string;
  accentColor?: string;
  iconBgcolor?: string;
};

export function buildPlatformOverviewMetrics(
  metrics: OperatorDashboardMetrics,
): DashboardMetricItem[] {
  const overview = metrics.platformOverview;

  if (!overview) {
    return [];
  }

  return [
    { key: 'organizations', label: 'Organizations', value: overview.totalOrganizations },
    { key: 'users', label: 'Total Users', value: overview.totalUsers },
    { key: 'lots', label: 'Parking Lots', value: overview.totalParkingLots },
    { key: 'slots', label: 'Total Slots', value: overview.totalSlots },
  ];
}

export function buildTenantAdminMetrics(metrics: OperatorDashboardMetrics): DashboardMetricItem[] {
  const items: DashboardMetricItem[] = [];
  const { bookings, parkingEvents, revenue } = metrics;

  if (bookings) {
    items.push(
      { key: 'bookings-total', label: 'Total Bookings', value: bookings.total },
      { key: 'bookings-today', label: "Today's Bookings", value: bookings.today },
      { key: 'bookings-week', label: 'Bookings This Week', value: bookings.thisWeek },
      {
        key: 'bookings-pending',
        label: 'Pending Bookings',
        value: bookings.pending,
        accentColor: statusStyles.PENDING.borderColor,
        iconBgcolor: statusStyles.PENDING.bgcolor,
      },
      {
        key: 'bookings-confirmed',
        label: 'Confirmed Bookings',
        value: bookings.confirmed,
        accentColor: statusStyles.CONFIRMED.borderColor,
        iconBgcolor: statusStyles.CONFIRMED.bgcolor,
      },
    );
  }

  if (parkingEvents) {
    items.push(
      {
        key: 'events-active',
        label: 'Active Parking Events',
        value: parkingEvents.active,
        accentColor: statusStyles.ACTIVE.borderColor,
        iconBgcolor: statusStyles.ACTIVE.bgcolor,
      },
      {
        key: 'events-completed',
        label: 'Completed Parking Events',
        value: parkingEvents.completed,
        accentColor: statusStyles.COMPLETED.borderColor,
        iconBgcolor: statusStyles.COMPLETED.bgcolor,
      },
      { key: 'check-ins-today', label: "Today's Check-ins", value: parkingEvents.checkInsToday },
      { key: 'check-outs-today', label: "Today's Check-outs", value: parkingEvents.checkOutsToday },
    );
  }

  if (revenue) {
    items.push(
      { key: 'revenue-today', label: 'Revenue Today', value: formatRupees(revenue.todayCollectedFees) },
      { key: 'revenue-week', label: 'Revenue This Week', value: formatRupees(revenue.weekCollectedFees) },
      { key: 'revenue-month', label: 'Revenue This Month', value: formatRupees(revenue.monthCollectedFees) },
    );
  }

  return items;
}

export function buildSecurityMetrics(metrics: OperatorDashboardMetrics): DashboardMetricItem[] {
  const items: DashboardMetricItem[] = [];
  const { bookings, parkingEvents } = metrics;

  if (bookings) {
    items.push({
      key: 'bookings-today',
      label: "Today's Bookings",
      value: bookings.today,
    });
  }

  if (parkingEvents) {
    items.push(
      {
        key: 'events-active',
        label: 'Active Parking Events',
        value: parkingEvents.active,
        accentColor: statusStyles.ACTIVE.borderColor,
        iconBgcolor: statusStyles.ACTIVE.bgcolor,
      },
      { key: 'check-ins-today', label: "Today's Check-ins", value: parkingEvents.checkInsToday },
      { key: 'check-outs-today', label: "Today's Check-outs", value: parkingEvents.checkOutsToday },
    );
  }

  return items;
}

export function buildUserOverviewMetrics(metrics: OperatorDashboardMetrics): DashboardMetricItem[] {
  const overview = metrics.userOverview;

  if (!overview) {
    return [];
  }

  return [
    { key: 'vehicles', label: 'My Vehicles', value: overview.totalVehicles },
    {
      key: 'upcoming-bookings',
      label: 'Upcoming Bookings',
      value: overview.upcomingBookings,
      accentColor: statusStyles.PENDING.borderColor,
      iconBgcolor: statusStyles.PENDING.bgcolor,
    },
    {
      key: 'active-events',
      label: 'Active Parking Sessions',
      value: overview.activeParkingEvents,
      accentColor: statusStyles.ACTIVE.borderColor,
      iconBgcolor: statusStyles.ACTIVE.bgcolor,
    },
    {
      key: 'completed-events',
      label: 'Completed Sessions',
      value: overview.completedParkingEvents,
      accentColor: statusStyles.COMPLETED.borderColor,
      iconBgcolor: statusStyles.COMPLETED.bgcolor,
    },
  ];
}

export function buildOccupancyMetrics(occupancy: OperatorDashboardMetrics['occupancy']): DashboardMetricItem[] {
  if (!occupancy) {
    return [];
  }

  return [
    { key: 'total-slots', label: 'Total Slots', value: occupancy.totalSlots },
    {
      key: 'available-slots',
      label: 'Available Slots',
      value: occupancy.availableSlots,
      accentColor: statusStyles.AVAILABLE.borderColor,
      iconBgcolor: statusStyles.AVAILABLE.bgcolor,
    },
    {
      key: 'occupied-slots',
      label: 'Occupied Slots',
      value: occupancy.occupiedSlots,
      accentColor: statusStyles.OCCUPIED.borderColor,
      iconBgcolor: statusStyles.OCCUPIED.bgcolor,
    },
    {
      key: 'reserved-slots',
      label: 'Reserved Slots',
      value: occupancy.reservedSlots,
      accentColor: statusStyles.RESERVED.borderColor,
      iconBgcolor: statusStyles.RESERVED.bgcolor,
    },
    {
      key: 'maintenance-slots',
      label: 'Maintenance Slots',
      value: occupancy.maintenanceSlots,
      accentColor: statusStyles.MAINTENANCE.borderColor,
      iconBgcolor: statusStyles.MAINTENANCE.bgcolor,
    },
    {
      key: 'utilization',
      label: 'Utilization',
      value: `${occupancy.utilizationPercent}%`,
    },
  ];
}