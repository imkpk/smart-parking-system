import {
  AssignRfidCredentialPayload,
  AssignRfidCredentialResult,
  GenerateQrCredentialResult,
  VehicleCredential,
} from '../types/iot';
import { apiClient } from './client';

export async function getVehicleCredentials(vehicleId: number) {
  const response = await apiClient.get<VehicleCredential[]>(
    `/vehicles/${vehicleId}/access-credentials`,
  );
  return response.data;
}

export async function assignRfidCredential(
  vehicleId: number,
  payload: AssignRfidCredentialPayload,
) {
  const response = await apiClient.post<AssignRfidCredentialResult>(
    `/vehicles/${vehicleId}/access-credentials/rfid`,
    payload,
  );
  return response.data;
}

export async function generateQrCredential(vehicleId: number) {
  const response = await apiClient.post<GenerateQrCredentialResult>(
    `/vehicles/${vehicleId}/access-credentials/qr`,
  );
  return response.data;
}

export async function revokeVehicleCredential(vehicleId: number, credentialId: number) {
  const response = await apiClient.post<VehicleCredential>(
    `/vehicles/${vehicleId}/access-credentials/${credentialId}/revoke`,
  );
  return response.data;
}