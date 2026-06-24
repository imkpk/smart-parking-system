import axios, { type InternalAxiosRequestConfig } from 'axios';
import { dispatchPlanLimitEvent, getPlanLimitDetail } from '../lib/planLimitError';
import { dispatchSlowRequestWarning } from '../lib/slowRequestWarning';
import { tokenStorage } from '../lib/tokenStorage';

const UNAUTHORIZED_EVENT = 'smart-parking:unauthorized';
const SLOW_REQUEST_WARNING_MS = 8000;

type RequestConfigWithTimer = InternalAxiosRequestConfig & {
  _slowRequestTimer?: number;
};

function clearSlowRequestTimer(config: InternalAxiosRequestConfig | undefined) {
  const timer = (config as RequestConfigWithTimer | undefined)?._slowRequestTimer;

  if (timer !== undefined) {
    window.clearTimeout(timer);
  }
}

export function createApiClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const requestConfig = config as RequestConfigWithTimer;
    requestConfig._slowRequestTimer = window.setTimeout(() => {
      dispatchSlowRequestWarning();
    }, SLOW_REQUEST_WARNING_MS);

    const token = tokenStorage.get();

    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    return requestConfig;
  });

  client.interceptors.response.use(
    (response) => {
      clearSlowRequestTimer(response.config);
      return response;
    },
    (error) => {
      clearSlowRequestTimer(error.config);

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