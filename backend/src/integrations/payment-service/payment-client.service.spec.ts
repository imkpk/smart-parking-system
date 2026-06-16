import axios, { AxiosError } from 'axios';
import { PAYMENT_CLIENT_TIMEOUT_MS } from './constants/payment-client.constants';
import { PaymentClientService } from './payment-client.service';

jest.mock('axios');

const mockedAxios = jest.mocked(axios, { shallow: false });

const fullPaymentResponse = {
  id: 1,
  parkingEventId: 1,
  bookingId: 1,
  userId: 1,
  amount: 80,
  currency: 'INR',
  status: 'INITIATED',
  paymentMethod: 'MOCK',
  providerReference: null,
  failureReason: null,
  createdAt: '2026-06-17T10:00:00.000Z',
  updatedAt: '2026-06-17T10:00:00.000Z',
};

describe('PaymentClientService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('initiates payment and unwraps Spring response data', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: fullPaymentResponse,
      },
    });

    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue('http://payment-service'),
    } as never);

    const result = await service.initiatePayment({
      parkingEventId: 1,
      bookingId: 1,
      userId: 1,
      amount: 80,
      currency: 'INR',
      paymentMethod: 'MOCK',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://payment-service/api/payments/initiate',
      {
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      },
      { headers: undefined, timeout: PAYMENT_CLIENT_TIMEOUT_MS },
    );
    expect(result).toEqual({
      paymentInitiated: true,
      payment: fullPaymentResponse,
    });
  });

  it('returns raw response body when Spring response is not wrapped', async () => {
    mockedAxios.post.mockResolvedValue({
      data: fullPaymentResponse,
    });

    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue(undefined),
    } as never);

    await expect(
      service.initiatePayment({
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      }),
    ).resolves.toEqual({
      paymentInitiated: true,
      payment: fullPaymentResponse,
    });
    expect(mockedAxios.post.mock.calls[0][0]).toBe(
      'http://localhost:8081/api/payments/initiate',
    );
  });

  it('forwards authorization header when provided', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { data: fullPaymentResponse },
    });

    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue('http://payment-service'),
    } as never);

    await service.initiatePayment(
      {
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      },
      'Bearer token',
    );

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://payment-service/api/payments/initiate',
      expect.any(Object),
      { headers: { Authorization: 'Bearer token' }, timeout: PAYMENT_CLIENT_TIMEOUT_MS },
    );
  });

  it('skips payment initiation when amount is below minimum', async () => {
    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue('http://payment-service'),
    } as never);

    await expect(
      service.initiatePayment({
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 0,
        currency: 'INR',
        paymentMethod: 'MOCK',
      }),
    ).resolves.toEqual({
      paymentInitiated: false,
      paymentError: 'Payment amount must be greater than zero',
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('returns unavailable when payment service cannot be reached', async () => {
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue({ response: undefined });

    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue('http://payment-service'),
    } as never);

    await expect(
      service.initiatePayment({
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      }),
    ).resolves.toEqual({
      paymentInitiated: false,
      paymentError: 'Payment service unavailable',
    });
  });

  it('returns timed out when payment service request times out', async () => {
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue({
      code: 'ECONNABORTED',
      response: undefined,
    } as AxiosError);

    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue('http://payment-service'),
    } as never);

    await expect(
      service.initiatePayment({
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      }),
    ).resolves.toEqual({
      paymentInitiated: false,
      paymentError: 'Payment service timed out',
    });
  });

  it('returns authorization failure for 401 or 403 responses', async () => {
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue({ response: { status: 403 } });

    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue('http://payment-service'),
    } as never);

    await expect(
      service.initiatePayment({
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      }),
    ).resolves.toEqual({
      paymentInitiated: false,
      paymentError: 'Payment service authorization failed',
    });
  });

  it('returns unavailable for non-Axios errors and other HTTP errors', async () => {
    mockedAxios.isAxiosError.mockReturnValueOnce(false);
    mockedAxios.post.mockRejectedValueOnce(new Error('boom'));

    const service = new PaymentClientService({
      get: jest.fn().mockReturnValue('http://payment-service'),
    } as never);

    await expect(
      service.initiatePayment({
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      }),
    ).resolves.toEqual({
      paymentInitiated: false,
      paymentError: 'Payment service unavailable',
    });

    mockedAxios.isAxiosError.mockReturnValueOnce(true);
    mockedAxios.post.mockRejectedValueOnce({ response: { status: 500 } });

    await expect(
      service.initiatePayment({
        parkingEventId: 1,
        bookingId: 1,
        userId: 1,
        amount: 80,
        currency: 'INR',
        paymentMethod: 'MOCK',
      }),
    ).resolves.toEqual({
      paymentInitiated: false,
      paymentError: 'Payment service unavailable',
    });
  });
});