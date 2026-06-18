import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPayment } from '../test/paymentFixtures';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('./createApiClient', () => ({
  createApiClient: () => ({
    get: getMock,
    post: postMock,
  }),
}));

import {
  getPayment,
  getPayments,
  getPaymentSummary,
  getUserPayments,
  mockPaymentFailure,
  mockPaymentSuccess,
  verifyRazorpayPayment,
} from './paymentsApi';

function wrapData<T>(data: T) {
  return {
    data: {
      success: true,
      message: 'OK',
      data,
      timestamp: '2026-06-17T10:00:00',
    },
  };
}

describe('paymentsApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  describe('getPayment', () => {
    it('fetches payment by id and unwraps response', async () => {
      const payment = createPayment({ id: 10, status: 'SUCCESS' });
      getMock.mockResolvedValue(wrapData(payment));

      const result = await getPayment(10);

      expect(getMock).toHaveBeenCalledWith('/payments/10');
      expect(result).toEqual(payment);
    });
  });

  describe('getPayments', () => {
    it('fetches all payments and unwraps response', async () => {
      const payments = [createPayment({ id: 10 }), createPayment({ id: 11 })];
      getMock.mockResolvedValue(wrapData(payments));

      const result = await getPayments();

      expect(getMock).toHaveBeenCalledWith('/payments');
      expect(result).toEqual(payments);
    });
  });

  describe('getUserPayments', () => {
    it('fetches payments for a user and unwraps response', async () => {
      const payments = [createPayment({ id: 10, userId: 5 })];
      getMock.mockResolvedValue(wrapData(payments));

      const result = await getUserPayments(5);

      expect(getMock).toHaveBeenCalledWith('/payments/user/5');
      expect(result).toEqual(payments);
    });
  });

  describe('getPaymentSummary', () => {
    it('fetches payment summary report and unwraps response', async () => {
      const summary = {
        totalPayments: 10,
        successfulAmount: 800,
        paymentsByStatus: { SUCCESS: 8, FAILED: 2 },
      };
      getMock.mockResolvedValue(wrapData(summary));

      const result = await getPaymentSummary();

      expect(getMock).toHaveBeenCalledWith('/payments/reports/summary');
      expect(result).toEqual(summary);
    });
  });

  describe('mockPaymentSuccess', () => {
    it('posts mock success for payment id', async () => {
      const payment = createPayment({ id: 10, status: 'SUCCESS' });
      postMock.mockResolvedValue(wrapData(payment));

      const result = await mockPaymentSuccess(10);

      expect(postMock).toHaveBeenCalledWith('/payments/10/mock-success');
      expect(result).toEqual(payment);
    });
  });

  describe('verifyRazorpayPayment', () => {
    it('posts verify request to payment-service', async () => {
      postMock.mockResolvedValue(wrapData({ id: 10, status: 'SUCCESS' }));

      const result = await verifyRazorpayPayment({
        paymentId: 10,
        razorpayOrderId: 'order_test_123',
        razorpayPaymentId: 'pay_test_456',
        razorpaySignature: 'signature_test',
      });

      expect(postMock).toHaveBeenCalledWith('/payments/verify', {
        paymentId: 10,
        razorpayOrderId: 'order_test_123',
        razorpayPaymentId: 'pay_test_456',
        razorpaySignature: 'signature_test',
      });
      expect(result).toEqual({ id: 10, status: 'SUCCESS' });
    });
  });

  describe('mockPaymentFailure', () => {
    it('posts mock failure with reason', async () => {
      const payment = createPayment({ id: 10, status: 'FAILED', failureReason: 'Declined' });
      postMock.mockResolvedValue(wrapData(payment));

      const result = await mockPaymentFailure({ id: 10, failureReason: 'Declined' });

      expect(postMock).toHaveBeenCalledWith('/payments/10/mock-failure', {
        failureReason: 'Declined',
      });
      expect(result).toEqual(payment);
    });
  });
});