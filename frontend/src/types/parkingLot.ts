export type ParkingLotType = 'APARTMENT' | 'MALL' | 'HOSPITAL' | 'OFFICE' | 'PUBLIC';

export interface ParkingLot {
  id: number;
  name: string;
  type: ParkingLotType;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
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
  isActive?: boolean;
}

export const parkingLotTypeOptions: ParkingLotType[] = [
  'APARTMENT',
  'MALL',
  'HOSPITAL',
  'OFFICE',
  'PUBLIC',
];
