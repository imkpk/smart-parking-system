import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('./createApiClient', () => ({
  createApiClient: () => ({
    post: postMock,
  }),
}));

import { verifyRazorpayPayment } from './paymentsApi';

describe('verifyRazorpayPayment', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts verify request to payment-service', async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        message: 'Payment verified',
        data: { id: 10, status: 'SUCCESS' },
        timestamp: '2026-06-17T10:00:00',
      },
    });

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