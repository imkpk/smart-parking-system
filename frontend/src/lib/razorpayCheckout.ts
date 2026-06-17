import { formatReceiptNo } from './formatters';
import { loadRazorpayScript } from './loadRazorpayScript';
import { getRazorpayKeyId } from './paymentRazorpay';
import { Payment } from '../types/payment';
import { RazorpaySuccessResponse } from '../types/razorpay';

export interface OpenRazorpayCheckoutOptions {
  payment: Payment;
  onSuccess: (response: RazorpaySuccessResponse) => void | Promise<void>;
  onDismiss?: () => void;
  onError: (message: string) => void;
}

export async function openRazorpayCheckout(options: OpenRazorpayCheckoutOptions): Promise<void> {
  const keyId = getRazorpayKeyId();

  if (!keyId) {
    options.onError('Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID.');
    return;
  }

  if (!options.payment.gatewayOrderId) {
    options.onError('Payment is missing Razorpay order details.');
    return;
  }

  try {
    await loadRazorpayScript();
  } catch {
    options.onError('Could not load Razorpay checkout. Please try again.');
    return;
  }

  if (!window.Razorpay) {
    options.onError('Could not load Razorpay checkout. Please try again.');
    return;
  }

  const checkout = new window.Razorpay({
    key: keyId,
    order_id: options.payment.gatewayOrderId,
    name: 'Smart Parking',
    description: `Parking payment ${formatReceiptNo(options.payment.id)}`,
    handler: (response) => {
      void options.onSuccess(response);
    },
    modal: {
      ondismiss: options.onDismiss,
    },
  });

  checkout.open();
}