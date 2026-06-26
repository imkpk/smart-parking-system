import { ParkingLotType } from './parkingLot';
import { VehicleType } from './vehicle';

export type AvailabilityType = 'LIVE' | 'UNKNOWN';

export interface PublicParkingFinderQuery {
  city?: string;
  vehicleType?: VehicleType;
  lat?: number;
  lng?: number;
  limit?: number;
}

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