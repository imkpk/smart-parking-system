import { ParkingLot, ParkingLotPayload } from '../types/parkingLot';
import { apiClient } from './client';

export async function getParkingLots() {
  const response = await apiClient.get<ParkingLot[]>('/parking-lots');
  return response.data;
}

export async function getParkingLot(id: number) {
  const response = await apiClient.get<ParkingLot>(`/parking-lots/${id}`);
  return response.data;
}

export async function createParkingLot(payload: ParkingLotPayload) {
  const response = await apiClient.post<ParkingLot>('/parking-lots', payload);
  return response.data;
}

export async function updateParkingLot(id: number, payload: ParkingLotPayload) {
  const response = await apiClient.patch<ParkingLot>(`/parking-lots/${id}`, payload);
  return response.data;
}

export async function deleteParkingLot(id: number) {
  const response = await apiClient.delete<ParkingLot>(`/parking-lots/${id}`);
  return response.data;
}
