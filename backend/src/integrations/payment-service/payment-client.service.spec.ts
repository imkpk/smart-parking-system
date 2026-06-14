import axios from 'axios';
import { PaymentClientService } from './payment-client.service';

jest.mock('axios');

const mockedAxios = jest.mocked(axios, { shallow: false });

describe('PaymentClientService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('initiates payment and unwraps Spring response data', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 1, status: 'INITIATED' },
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
      { headers: undefined, timeout: 5000 },
    );
    expect(result).toEqual({
      paymentInitiated: true,
      payment: { id: 1, status: 'INITIATED' },
    });
  });

  it('returns raw response body when Spring response is not wrapped', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { id: 1, status: 'INITIATED' },
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
      payment: { id: 1, status: 'INITIATED' },
    });
    expect(mockedAxios.post.mock.calls[0][0]).toBe(
      'http://localhost:8081/api/payments/initiate',
    );
  });

  it('forwards authorization header when provided', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { data: { id: 1, status: 'INITIATED' } },
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
      { headers: { Authorization: 'Bearer token' }, timeout: 5000 },
    );
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
