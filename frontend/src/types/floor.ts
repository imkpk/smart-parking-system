export interface Floor {
  id: number;
  name: string;
  level: number | null;
  parkingLotId: number;
  createdAt: string;
  updatedAt: string;
}

export interface FloorPayload {
  name: string;
  level?: number;
}
