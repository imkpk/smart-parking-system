import {
  Gate,
  GateAccessAttempt,
  GateDetection,
  GateLiveStatus,
  GatePayload,
  ManualGateOpenPayload,
  ManualGateOpenResult,
} from '../types/iot';
import { apiClient } from './client';

export async function getGatesByParkingLot(parkingLotId: number) {
  const response = await apiClient.get<Gate[]>(`/parking-lots/${parkingLotId}/gates`);
  return response.data;
}

export async function getGate(gateId: number) {
  const response = await apiClient.get<Gate>(`/gates/${gateId}`);
  return response.data;
}

export async function createGate(parkingLotId: number, payload: GatePayload) {
  const response = await apiClient.post<Gate>(`/parking-lots/${parkingLotId}/gates`, payload);
  return response.data;
}

export async function updateGate(gateId: number, payload: Partial<GatePayload>) {
  const response = await apiClient.patch<Gate>(`/gates/${gateId}`, payload);
  return response.data;
}

export async function deleteGate(gateId: number) {
  const response = await apiClient.delete<Gate>(`/gates/${gateId}`);
  return response.data;
}

export async function getGateLiveStatus(gateId: number) {
  const response = await apiClient.get<GateLiveStatus>(`/gates/${gateId}/live`);
  return response.data;
}

export async function getGateDetections(gateId: number, limit = 10) {
  const response = await apiClient.get<GateDetection[]>(`/gates/${gateId}/detections`, {
    params: { limit },
  });
  return response.data;
}

export async function getGateAccessAttempts(gateId: number, limit = 10) {
  const response = await apiClient.get<GateAccessAttempt[]>(`/gates/${gateId}/access-attempts`, {
    params: { limit },
  });
  return response.data;
}

export async function manualOpenGate(gateId: number, payload: ManualGateOpenPayload) {
  const response = await apiClient.post<ManualGateOpenResult>(
    `/gates/${gateId}/manual-open`,
    payload,
  );
  return response.data;
}