import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPayment } from '../test/paymentFixtures';
import { resetRazorpayScriptLoaderForTests } from './loadRazorpayScript';
import { openRazorpayCheckout } from './razorpayCheckout';

describe('openRazorpayCheckout', () => {
  beforeEach(() => {
    resetRazorpayScriptLoaderForTests();
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', 'rzp_test_key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.Razorpay;
    document.body.innerHTML = '';
  });

  it('shows friendly error when Razorpay key is missing', async () => {
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', '');
    const onError = vi.fn();

    await openRazorpayCheckout({
      payment: createPayment({
        provider: 'RAZORPAY',
        gatewayOrderId: 'order_test_123',
      }),
      onSuccess: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith(
      'Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID.',
    );
  });

  it('shows friendly error when gateway order id is missing', async () => {
    const onError = vi.fn();

    await openRazorpayCheckout({
      payment: createPayment({
        provider: 'RAZORPAY',
        gatewayOrderId: null,
      }),
      onSuccess: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith('Payment is missing Razorpay order details.');
  });

  it('calls verify flow on successful Razorpay callback', async () => {
    const onSuccess = vi.fn();
    const open = vi.fn();

    window.Razorpay = vi.fn().mockImplementation((options) => {
      options.handler({
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: 'signature_test',
      });

      return { open };
    });

    await openRazorpayCheckout({
      payment: createPayment({
        provider: 'RAZORPAY',
        gatewayOrderId: 'order_test_123',
      }),
      onSuccess,
      onError: vi.fn(),
    });

    expect(onSuccess).toHaveBeenCalledWith({
      razorpay_order_id: 'order_test_123',
      razorpay_payment_id: 'pay_test_456',
      razorpay_signature: 'signature_test',
    });
    expect(open).toHaveBeenCalled();
  });
});