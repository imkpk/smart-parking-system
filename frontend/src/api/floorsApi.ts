import { Floor, FloorPayload } from '../types/floor';
import { apiClient } from './client';

export async function getFloors(parkingLotId: number) {
  const response = await apiClient.get<Floor[]>(`/parking-lots/${parkingLotId}/floors`);
  return response.data;
}

export async function createFloor(parkingLotId: number, payload: FloorPayload) {
  const response = await apiClient.post<Floor>(`/parking-lots/${parkingLotId}/floors`, payload);
  return response.data;
}

export async function updateFloor(id: number, payload: FloorPayload) {
  const response = await apiClient.patch<Floor>(`/floors/${id}`, payload);
  return response.data;
}

export async function deleteFloor(id: number) {
  const response = await apiClient.delete<Floor>(`/floors/${id}`);
  return response.data;
}
