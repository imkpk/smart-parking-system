import { BookingStatus, ParkingEventStatus, SlotStatus } from '@prisma/client';
import { SafeUser } from '../users/types/safe-user.type';
import { SlotMapLegend, SlotMapOccupancySummary, SlotMapSlotItem } from './types/slot-map-response.type';

const KNOWN_SLOT_STATUSES = new Set<string>(Object.values(SlotStatus));

export function normalizeSlotStatus(status: string): SlotStatus | 'UNKNOWN' {
  return KNOWN_SLOT_STATUSES.has(status) ? (status as SlotStatus) : 'UNKNOWN';
}

export function createEmptyLegend(): SlotMapLegend {
  return {
    AVAILABLE: 0,
    RESERVED: 0,
    OCCUPIED: 0,
    MAINTENANCE: 0,
    UNKNOWN: 0,
  };
}

export function incrementLegend(legend: SlotMapLegend, status: SlotStatus | 'UNKNOWN') {
  legend[status] += 1;
}

type SlotWithRelations = {
  id: number;
  slotNumber: string;
  slotType: SlotMapSlotItem['slotType'];
  status: SlotStatus;
  floor: {
    id: number;
    name: string;
    level: number | null;
  };
  bookings: Array<{
    id: number;
    bookingCode: string;
    vehicle: { vehicleNumber: string };
  }>;
  events: Array<{
    id: number;
    checkInTime: Date;
    bookingId: number;
    booking: { id: number; bookingCode: string };
    vehicle: { vehicleNumber: string };
  }>;
};

export function buildSlotMapOccupancy(
  slot: SlotWithRelations,
  currentUser: SafeUser,
  isUserRole: boolean,
): SlotMapOccupancySummary | undefined {
  const activeEvent = slot.events[0];

  if (activeEvent) {
    const summary: SlotMapOccupancySummary = {
      state: 'OCCUPIED',
      bookingId: activeEvent.bookingId,
      eventId: activeEvent.id,
      checkedInAt: activeEvent.checkInTime.toISOString(),
    };

    if (!isUserRole) {
      summary.vehicleNumber = activeEvent.vehicle.vehicleNumber;
      summary.bookingCode = activeEvent.booking.bookingCode;
    }

    return summary;
  }

  const activeBooking = slot.bookings[0];

  if (activeBooking && slot.status === SlotStatus.RESERVED) {
    const summary: SlotMapOccupancySummary = {
      state: 'RESERVED',
      bookingId: activeBooking.id,
    };

    if (!isUserRole) {
      summary.vehicleNumber = activeBooking.vehicle.vehicleNumber;
      summary.bookingCode = activeBooking.bookingCode;
    }

    return summary;
  }

  return undefined;
}

export function resolveSlotMapDisplayStatus(
  slotStatus: SlotStatus,
  hasActiveEvent: boolean,
): SlotStatus | 'UNKNOWN' {
  if (hasActiveEvent) {
    return SlotStatus.OCCUPIED;
  }

  return normalizeSlotStatus(slotStatus);
}

export function mapSlotToMapItem(
  slot: SlotWithRelations,
  currentUser: SafeUser,
  isUserRole: boolean,
): SlotMapSlotItem {
  const hasActiveEvent = slot.events.length > 0;
  const normalizedStatus = resolveSlotMapDisplayStatus(slot.status, hasActiveEvent);

  return {
    id: slot.id,
    slotNumber: slot.slotNumber,
    slotType: slot.slotType,
    status: normalizedStatus,
    displayLabel: slot.slotNumber,
    floorId: slot.floor.id,
    floorName: slot.floor.name,
    floorLevel: slot.floor.level,
    isMaintenance: normalizedStatus === SlotStatus.MAINTENANCE,
    occupancy: buildSlotMapOccupancy(slot, currentUser, isUserRole),
  };
}

export const slotMapBookingInclude = {
  where: { status: BookingStatus.CONFIRMED },
  orderBy: { createdAt: 'desc' as const },
  take: 1,
  select: {
    id: true,
    bookingCode: true,
    vehicle: { select: { vehicleNumber: true } },
  },
};

export const slotMapEventInclude = {
  where: { status: ParkingEventStatus.ACTIVE },
  take: 1,
  select: {
    id: true,
    checkInTime: true,
    bookingId: true,
    booking: { select: { id: true, bookingCode: true } },
    vehicle: { select: { vehicleNumber: true } },
  },
};