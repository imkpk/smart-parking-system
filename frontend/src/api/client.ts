import { createApiClient } from './createApiClient';

export const apiClient = createApiClient(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
);