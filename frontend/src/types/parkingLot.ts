export type ParkingLotType = 'APARTMENT' | 'MALL' | 'HOSPITAL' | 'OFFICE' | 'PUBLIC';

export type ParkingLotVisibility = 'PRIVATE' | 'PUBLIC' | 'INVITE_ONLY';

export interface ParkingLot {
  id: number;
  name: string;
  type: ParkingLotType;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  visibility: ParkingLotVisibility;
  latitude: string | null;
  longitude: string | null;
  baseHourlyRate: string | null;
  currency: string | null;
  openingHours: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingLotPayload {
  name: string;
  type: ParkingLotType;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  visibility?: ParkingLotVisibility;
  latitude?: number | null;
  longitude?: number | null;
  baseHourlyRate?: number | null;
  currency?: string;
  openingHours?: string;
  isActive?: boolean;
}

export const parkingLotTypeOptions: ParkingLotType[] = [
  'APARTMENT',
  'MALL',
  'HOSPITAL',
  'OFFICE',
  'PUBLIC',
];

export const parkingLotVisibilityOptions: ParkingLotVisibility[] = [
  'PRIVATE',
  'PUBLIC',
  'INVITE_ONLY',
];