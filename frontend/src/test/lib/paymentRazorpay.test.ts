import { describe, expect, it } from 'vitest';
import { createPayment } from '@/test/paymentFixtures';
import {
  buildVerifyRazorpayPaymentRequest,
  canShowPayNow,
} from '@/lib/paymentRazorpay';

describe('canShowPayNow', () => {
  it('shows Pay Now for initiated Razorpay payments with gateway order id', () => {
    const payment = createPayment({
      provider: 'RAZORPAY',
      gatewayOrderId: 'order_test_123',
    });

    expect(
      canShowPayNow(payment, { isAdmin: false, isUser: true, currentUserId: 1 }),
    ).toBe(true);
  });

  it('hides Pay Now for MOCK payments', () => {
    const payment = createPayment({ provider: 'MOCK' });

    expect(
      canShowPayNow(payment, { isAdmin: false, isUser: true, currentUserId: 1 }),
    ).toBe(false);
  });

  it('hides Pay Now for SUCCESS payments', () => {
    const payment = createPayment({
      status: 'SUCCESS',
      provider: 'RAZORPAY',
      gatewayOrderId: 'order_test_123',
    });

    expect(
      canShowPayNow(payment, { isAdmin: false, isUser: true, currentUserId: 1 }),
    ).toBe(false);
  });

  it('hides Pay Now for FAILED payments', () => {
    const payment = createPayment({
      status: 'FAILED',
      provider: 'RAZORPAY',
      gatewayOrderId: 'order_test_123',
    });

    expect(
      canShowPayNow(payment, { isAdmin: false, isUser: true, currentUserId: 1 }),
    ).toBe(false);
  });

  it('hides Pay Now when gateway order id is missing', () => {
    const payment = createPayment({
      provider: 'RAZORPAY',
      gatewayOrderId: null,
    });

    expect(
      canShowPayNow(payment, { isAdmin: false, isUser: true, currentUserId: 1 }),
    ).toBe(false);
  });

  it('allows admin to pay Razorpay payments', () => {
    const payment = createPayment({
      provider: 'RAZORPAY',
      gatewayOrderId: 'order_test_123',
      userId: 99,
    });

    expect(
      canShowPayNow(payment, { isAdmin: true, isUser: false, currentUserId: 1 }),
    ).toBe(true);
  });

  it('hides Pay Now for security role', () => {
    const payment = createPayment({
      provider: 'RAZORPAY',
      gatewayOrderId: 'order_test_123',
    });

    expect(
      canShowPayNow(payment, { isAdmin: false, isUser: false, currentUserId: 50 }),
    ).toBe(false);
  });

  it('hides Pay Now when user does not own the payment', () => {
    const payment = createPayment({
      provider: 'RAZORPAY',
      gatewayOrderId: 'order_test_123',
      userId: 2,
    });

    expect(
      canShowPayNow(payment, { isAdmin: false, isUser: true, currentUserId: 1 }),
    ).toBe(false);
  });
});

describe('buildVerifyRazorpayPaymentRequest', () => {
  it('maps Razorpay callback fields to verify request', () => {
    expect(
      buildVerifyRazorpayPaymentRequest(10, {
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: 'signature_test',
      }),
    ).toEqual({
      paymentId: 10,
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_456',
      razorpaySignature: 'signature_test',
    });
  });
});