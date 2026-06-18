import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { getApiErrorMessage, isForbiddenError } from '@/lib/apiError';

function createAxiosError(status: number, data?: object) {
  return new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {} as never,
    data,
  });
}

describe('getApiErrorMessage', () => {
  it('joins array message from axios error response', () => {
    const error = createAxiosError(400, { message: ['Email is required', 'Password is required'] });

    expect(getApiErrorMessage(error)).toBe('Email is required, Password is required');
  });

  it('returns string message from axios error response', () => {
    const error = createAxiosError(400, { message: 'Invalid credentials' });

    expect(getApiErrorMessage(error)).toBe('Invalid credentials');
  });

  it('returns error field when message is missing', () => {
    const error = createAxiosError(400, { error: 'Bad Request' });

    expect(getApiErrorMessage(error)).toBe('Bad Request');
  });

  it('returns fallback for axios error without response data', () => {
    const error = new AxiosError('Network Error');

    expect(getApiErrorMessage(error)).toBe('Something went wrong.');
  });

  it('returns fallback for non-axios errors', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('Something went wrong.');
  });

  it('uses custom fallback when provided', () => {
    expect(getApiErrorMessage('unknown', 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('isForbiddenError', () => {
  it('returns true for 403 axios errors', () => {
    expect(isForbiddenError(createAxiosError(403))).toBe(true);
  });

  it('returns false for non-403 axios errors', () => {
    expect(isForbiddenError(createAxiosError(401))).toBe(false);
  });

  it('returns false for non-axios errors', () => {
    expect(isForbiddenError(new Error('forbidden'))).toBe(false);
  });
});