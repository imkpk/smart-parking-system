import { Vehicle, VehiclePayload } from '../types/vehicle';
import { apiClient } from './client';

export async function createVehicle(payload: VehiclePayload) {
  const response = await apiClient.post<Vehicle>('/vehicles', payload);
  return response.data;
}

export async function getMyVehicles() {
  const response = await apiClient.get<Vehicle[]>('/vehicles/my');
  return response.data;
}

export async function getVehicles() {
  const response = await apiClient.get<Vehicle[]>('/vehicles');
  return response.data;
}

export async function getVehicle(id: number) {
  const response = await apiClient.get<Vehicle>(`/vehicles/${id}`);
  return response.data;
}

export async function updateVehicle(id: number, payload: VehiclePayload) {
  const response = await apiClient.patch<Vehicle>(`/vehicles/${id}`, payload);
  return response.data;
}

export async function deleteVehicle(id: number) {
  const response = await apiClient.delete<Vehicle>(`/vehicles/${id}`);
  return response.data;
}
