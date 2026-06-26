import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

const { getTokenMock, requestUseMock, responseUseMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  requestUseMock: vi.fn(),
  responseUseMock: vi.fn(),
}));

vi.mock('@/lib/tokenStorage', () => ({
  tokenStorage: {
    get: getTokenMock,
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();

  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          request: { use: requestUseMock },
          response: { use: responseUseMock },
        },
      })),
    },
  };
});

import { createApiClient } from '@/api/createApiClient';

describe('createApiClient', () => {
  beforeEach(() => {
    requestUseMock.mockReset();
    responseUseMock.mockReset();
    getTokenMock.mockReset();
  });

  it('registers request and response interceptors', () => {
    createApiClient('http://localhost:3000/api');

    expect(requestUseMock).toHaveBeenCalledOnce();
    expect(responseUseMock).toHaveBeenCalledOnce();
  });

  it('adds Bearer token to request when token exists', () => {
    getTokenMock.mockReturnValue('test-token');
    createApiClient('http://localhost:3000/api');

    const requestHandler = requestUseMock.mock.calls[0][0] as (
      config: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig;

    const config = { headers: {} } as InternalAxiosRequestConfig;
    const result = requestHandler(config);

    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('does not add Authorization header when token is missing', () => {
    getTokenMock.mockReturnValue(null);
    createApiClient('http://localhost:3000/api');

    const requestHandler = requestUseMock.mock.calls[0][0] as (
      config: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig;

    const config = { headers: {} } as InternalAxiosRequestConfig;
    const result = requestHandler(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('does not add Authorization header for public parking finder requests', () => {
    getTokenMock.mockReturnValue('test-token');
    createApiClient('http://localhost:3000/api');

    const requestHandler = requestUseMock.mock.calls[0][0] as (
      config: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig;

    const config = {
      headers: {},
      url: '/public/parking-finder',
    } as InternalAxiosRequestConfig;
    const result = requestHandler(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('passes through successful responses', () => {
    createApiClient('http://localhost:3000/api');

    const successHandler = responseUseMock.mock.calls[0][0] as (response: {
      data: string;
    }) => { data: string };

    const response = { data: 'ok' };
    expect(successHandler(response)).toBe(response);
  });

  it('dispatches unauthorized event and rejects on 401', async () => {
    createApiClient('http://localhost:3000/api');

    const errorHandler = responseUseMock.mock.calls[0][1] as (error: AxiosError) => Promise<never>;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
      data: {},
    });

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'smart-parking:unauthorized' }));
  });

  it('does not dispatch unauthorized event for public API 401 responses', async () => {
    createApiClient('http://localhost:3000/api');

    const errorHandler = responseUseMock.mock.calls[0][1] as (error: AxiosError) => Promise<never>;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const error = new AxiosError(
      'Unauthorized',
      '401',
      { url: '/public/parking-finder' } as InternalAxiosRequestConfig,
      undefined,
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { url: '/public/parking-finder' } as InternalAxiosRequestConfig,
        data: {},
      },
    );

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('rejects non-401 errors without dispatching unauthorized event', async () => {
    createApiClient('http://localhost:3000/api');

    const errorHandler = responseUseMock.mock.calls[0][1] as (error: AxiosError) => Promise<never>;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const error = new AxiosError('Server error', '500', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
      data: {},
    });

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});