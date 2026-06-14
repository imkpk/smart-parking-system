import { AxiosError } from 'axios';

interface ErrorResponse {
  message?: string | string[];
  error?: string;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined;
    const message = data?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (message) {
      return message;
    }

    if (data?.error) {
      return data.error;
    }
  }

  return fallback;
}

export function isForbiddenError(error: unknown) {
  return error instanceof AxiosError && error.response?.status === 403;
}
