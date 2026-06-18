import { SlotMapQuery, SlotMapResponse } from '../types/slotMap';
import { apiClient } from './client';

export async function getSlotMap(parkingLotId: number, query: SlotMapQuery = {}) {
  const response = await apiClient.get<SlotMapResponse>(`/parking-lots/${parkingLotId}/slot-map`, {
    params: query,
  });
  return response.data;
}