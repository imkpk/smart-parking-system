import { Payment, VerifyRazorpayPaymentRequest } from '../types/payment';
import { RazorpaySuccessResponse } from '../types/razorpay';

export interface PayNowAccess {
  isAdmin: boolean;
  isUser: boolean;
  currentUserId?: number;
}

export function canShowPayNow(payment: Payment, access: PayNowAccess): boolean {
  if (!access.isAdmin && !access.isUser) {
    return false;
  }

  if (payment.status !== 'INITIATED') {
    return false;
  }

  if (payment.provider !== 'RAZORPAY') {
    return false;
  }

  if (!payment.gatewayOrderId) {
    return false;
  }

  if (access.isUser && payment.userId !== access.currentUserId) {
    return false;
  }

  return true;
}

export function getRazorpayKeyId(): string | undefined {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

  if (!keyId || keyId.trim() === '') {
    return undefined;
  }

  return keyId.trim();
}

export function buildVerifyRazorpayPaymentRequest(
  paymentId: number,
  response: RazorpaySuccessResponse,
): VerifyRazorpayPaymentRequest {
  return {
    paymentId,
    razorpayOrderId: response.razorpay_order_id,
    razorpayPaymentId: response.razorpay_payment_id,
    razorpaySignature: response.razorpay_signature,
  };
}