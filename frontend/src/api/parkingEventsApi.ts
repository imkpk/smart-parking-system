import {
  CheckInPayload,
  CheckOutPayload,
  CheckOutResult,
  ParkingEvent,
} from '../types/parkingEvent';
import { apiClient } from './client';

export async function checkInParkingEvent(payload: CheckInPayload) {
  const response = await apiClient.post<ParkingEvent>('/parking-events/check-in', payload);
  return response.data;
}

export async function checkOutParkingEvent(payload: CheckOutPayload) {
  const response = await apiClient.post<CheckOutResult>('/parking-events/check-out', payload);
  return response.data;
}

export async function getActiveParkingEvents() {
  const response = await apiClient.get<ParkingEvent[]>('/parking-events/active');
  return response.data;
}

export async function getParkingEventHistory() {
  const response = await apiClient.get<ParkingEvent[]>('/parking-events/history');
  return response.data;
}

export async function getParkingEvents() {
  const response = await apiClient.get<ParkingEvent[]>('/parking-events');
  return response.data;
}

export async function getParkingEvent(id: number) {
  const response = await apiClient.get<ParkingEvent>(`/parking-events/${id}`);
  return response.data;
}
