import { AxiosError } from 'axios';

export const PLAN_LIMIT_EVENT = 'smart-parking:plan-limit';

export type PlanLimitDetail = {
  message: string;
  resource?: string;
};

export function getPlanLimitDetail(error: unknown): PlanLimitDetail | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  if (error.response?.status !== 403) {
    return null;
  }

  const message =
    typeof error.response.data?.message === 'string'
      ? error.response.data.message
      : typeof error.response.data === 'string'
        ? error.response.data
        : '';

  if (!message.toLowerCase().includes('plan limit reached')) {
    return null;
  }

  const resourceMatch = message.match(/for\s+([^.]+)\./i);

  return {
    message,
    resource: resourceMatch?.[1]?.trim(),
  };
}

export function dispatchPlanLimitEvent(detail: PlanLimitDetail) {
  window.dispatchEvent(new CustomEvent<PlanLimitDetail>(PLAN_LIMIT_EVENT, { detail }));
}