export type SlotType = 'CAR' | 'BIKE' | 'EV' | 'HANDICAPPED';
export type SlotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

export interface Slot {
  id: number;
  slotNumber: string;
  slotType: SlotType;
  status: SlotStatus;
  floorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SlotPayload {
  slotNumber: string;
  slotType?: SlotType;
  status?: SlotStatus;
}

export interface BulkSlotForm {
  floorId: number;
  prefix: string;
  startNumber: number;
  count: number;
  slotType: SlotType;
}

export const slotTypeOptions: SlotType[] = ['CAR', 'BIKE', 'EV', 'HANDICAPPED'];
export const slotStatusOptions: SlotStatus[] = [
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'MAINTENANCE',
];
