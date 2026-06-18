import { SlotStatus, SlotType } from '@prisma/client';

export type SlotMapOccupancyState = 'OCCUPIED' | 'RESERVED';

export type SlotMapOccupancySummary = {
  state: SlotMapOccupancyState;
  vehicleNumber?: string;
  bookingCode?: string;
  bookingId?: number;
  eventId?: number;
  checkedInAt?: string;
};

export type SlotMapSlotItem = {
  id: number;
  slotNumber: string;
  slotType: SlotType;
  status: SlotStatus | 'UNKNOWN';
  displayLabel: string;
  floorId: number;
  floorName: string;
  floorLevel: number | null;
  isMaintenance: boolean;
  occupancy?: SlotMapOccupancySummary;
};

export type SlotMapFloorGroup = {
  floorId: number;
  floorName: string;
  level: number | null;
  slots: SlotMapSlotItem[];
};

export type SlotMapLegend = {
  AVAILABLE: number;
  RESERVED: number;
  OCCUPIED: number;
  MAINTENANCE: number;
  UNKNOWN: number;
};

export type SlotMapResponse = {
  parkingLot: {
    id: number;
    name: string;
    isActive: boolean;
  };
  floors: Array<{
    id: number;
    name: string;
    level: number | null;
    slotCount: number;
  }>;
  selectedFloorId: number | null;
  groups: SlotMapFloorGroup[];
  legend: SlotMapLegend;
  filters: {
    floorId: number | null;
    status: SlotStatus | null;
    vehicleType: SlotType | null;
  };
  lastUpdated: string;
};