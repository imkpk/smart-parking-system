import { SecurityGateSearchResult } from '../types/securityGate';
import { apiClient } from './client';

export async function searchSecurityGate(query: string) {
  const response = await apiClient.get<SecurityGateSearchResult>('/security/gate/search', {
    params: { q: query },
  });

  return response.data;
}