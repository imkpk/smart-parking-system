import { IotDevice, IotDeviceUpdatePayload } from '../types/iot';
import { apiClient } from './client';

export async function getGateDevices(gateId: number) {
  const response = await apiClient.get<IotDevice[]>(`/gates/${gateId}/devices`);
  return response.data;
}

export async function updateIotDevice(deviceId: number, payload: IotDeviceUpdatePayload) {
  const response = await apiClient.patch<IotDevice>(`/iot-devices/${deviceId}`, payload);
  return response.data;
}