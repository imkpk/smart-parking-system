export type VehicleType = 'CAR' | 'BIKE' | 'EV';

export interface Vehicle {
  id: number;
  userId: number;
  vehicleNumber: string;
  vehicleType: VehicleType;
  brand: string | null;
  model: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclePayload {
  vehicleNumber: string;
  vehicleType: VehicleType;
  brand?: string;
  model?: string;
  color?: string;
}

export const vehicleTypeOptions: VehicleType[] = ['CAR', 'BIKE', 'EV'];
