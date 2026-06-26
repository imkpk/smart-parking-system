import { ParkingLotType } from '@prisma/client';

export type AvailabilityType = 'LIVE' | 'UNKNOWN';

export interface PublicParkingFinderResult {
  id: number;
  name: string;
  organizationName: string;
  type: ParkingLotType;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  baseHourlyRate: string | null;
  currency: string | null;
  openingHours: string | null;
  totalSlots: number;
  availableSlots: number;
  availabilityType: AvailabilityType;
  bookable: boolean;
  distanceKm?: number | null;
}