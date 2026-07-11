import {
  AssignRfidCredentialPayload,
  AssignRfidCredentialResult,
  GenerateQrCredentialResult,
  VehicleCredential,
} from '../types/iot';
import { apiClient } from './client';

export async function getVehicleCredentials(vehicleId: number) {
  const response = await apiClient.get<VehicleCredential[]>(`/vehicles/${vehicleId}/credentials`);
  return response.data;
}

export async function assignRfidCredential(
  vehicleId: number,
  payload: AssignRfidCredentialPayload,
) {
  const response = await apiClient.post<AssignRfidCredentialResult>(
    `/vehicles/${vehicleId}/credentials/rfid`,
    payload,
  );
  return response.data;
}

export async function generateQrCredential(vehicleId: number) {
  const response = await apiClient.post<GenerateQrCredentialResult>(
    `/vehicles/${vehicleId}/credentials/qr`,
  );
  return response.data;
}

export async function revokeVehicleCredential(credentialId: number) {
  const response = await apiClient.post<VehicleCredential>(
    `/vehicle-credentials/${credentialId}/revoke`,
  );
  return response.data;
}