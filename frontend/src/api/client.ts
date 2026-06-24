import { getApiBaseUrl } from '../lib/apiEnv';
import { createApiClient } from './createApiClient';

export const apiClient = createApiClient(getApiBaseUrl());