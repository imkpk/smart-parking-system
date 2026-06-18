import {
  TenantBrandingResponse,
  UpdateTenantBrandingPayload,
} from '../types/branding';
import { apiClient } from './client';

export async function getPublicBranding(slug: string) {
  const response = await apiClient.get<TenantBrandingResponse>(
    `/organizations/public-branding/${encodeURIComponent(slug)}`,
  );
  return response.data;
}

export async function getCurrentBranding() {
  const response = await apiClient.get<TenantBrandingResponse>(
    '/organizations/current/branding',
  );
  return response.data;
}

export async function updateOrganizationBranding(payload: UpdateTenantBrandingPayload) {
  const response = await apiClient.patch<TenantBrandingResponse>(
    '/organizations/current/branding',
    payload,
  );
  return response.data;
}