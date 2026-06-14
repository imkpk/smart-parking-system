import { Slot, SlotPayload, SlotStatus } from '../types/slot';
import { apiClient } from './client';

export async function getSlots(parkingLotId: number) {
  const response = await apiClient.get<Slot[]>(`/parking-lots/${parkingLotId}/slots`);
  return response.data;
}

export async function getAvailableSlots(parkingLotId: number) {
  const response = await apiClient.get<Slot[]>(`/parking-lots/${parkingLotId}/available-slots`);
  return response.data;
}

export async function createSlot(floorId: number, payload: SlotPayload) {
  const response = await apiClient.post<Slot>(`/floors/${floorId}/slots`, payload);
  return response.data;
}

export async function createBulkSlots(floorId: number, slots: SlotPayload[]) {
  const response = await apiClient.post<Slot[]>(`/floors/${floorId}/slots/bulk`, { slots });
  return response.data;
}

export async function updateSlotStatus(id: number, status: SlotStatus) {
  const response = await apiClient.patch<Slot>(`/slots/${id}/status`, { status });
  return response.data;
}

export async function deleteSlot(id: number) {
  const response = await apiClient.delete<Slot>(`/slots/${id}`);
  return response.data;
}

export async function deleteSlots(ids: number[]) {
  const response = await apiClient.delete<Slot[]>(`/slots`, {
    data: { ids },
  });
  return response.data;
}
