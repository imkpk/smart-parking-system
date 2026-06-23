import axios from 'axios';
import { dispatchPlanLimitEvent, getPlanLimitDetail } from '../lib/planLimitError';
import { tokenStorage } from '../lib/tokenStorage';

const UNAUTHORIZED_EVENT = 'smart-parking:unauthorized';

export function createApiClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = tokenStorage.get();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }

      const planLimitDetail = getPlanLimitDetail(error);

      if (planLimitDetail) {
        dispatchPlanLimitEvent(planLimitDetail);
      }

      return Promise.reject(error);
    },
  );

  return client;
}