import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPayment } from '@/test/paymentFixtures';
import { resetRazorpayScriptLoaderForTests } from '@/lib/loadRazorpayScript';
import { openRazorpayCheckout } from '@/lib/razorpayCheckout';

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

  it('shows friendly error when Razorpay script fails to load', async () => {
    const onError = vi.fn();

    const checkoutPromise = openRazorpayCheckout({
      payment: createPayment({
        provider: 'RAZORPAY',
        gatewayOrderId: 'order_test_123',
      }),
      onSuccess: vi.fn(),
      onError,
    });

    const script = document.getElementById('razorpay-checkout-js') as HTMLScriptElement;
    script.onerror?.(new Event('error') as Event);

    await checkoutPromise;

    expect(onError).toHaveBeenCalledWith(
      'Could not load Razorpay checkout. Please try again.',
    );
  });

  it('shows friendly error when Razorpay is missing after script load', async () => {
    const onError = vi.fn();

    const checkoutPromise = openRazorpayCheckout({
      payment: createPayment({
        provider: 'RAZORPAY',
        gatewayOrderId: 'order_test_123',
      }),
      onSuccess: vi.fn(),
      onError,
    });

    const script = document.getElementById('razorpay-checkout-js') as HTMLScriptElement;
    script.onload?.(new Event('load') as Event);

    await checkoutPromise;

    expect(onError).toHaveBeenCalledWith(
      'Could not load Razorpay checkout. Please try again.',
    );
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