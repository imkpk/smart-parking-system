import { createApiClient } from './createApiClient';
import { getPaymentApiBaseUrl } from '../lib/apiEnv';
import {
  Payment,
  PaymentApiResponse,
  PaymentSummary,
  VerifyRazorpayPaymentRequest,
} from '../types/payment';

export type { VerifyRazorpayPaymentRequest };

export const paymentApiClient = createApiClient(getPaymentApiBaseUrl());

function unwrap<T>(response: { data: PaymentApiResponse<T> }) {
  return response.data.data;
}

export async function getPayment(id: number) {
  const response = await paymentApiClient.get<PaymentApiResponse<Payment>>(`/payments/${id}`);
  return unwrap(response);
}

export async function getPayments() {
  const response = await paymentApiClient.get<PaymentApiResponse<Payment[]>>('/payments');
  return unwrap(response);
}

export async function getUserPayments(userId: number) {
  const response = await paymentApiClient.get<PaymentApiResponse<Payment[]>>(
    `/payments/user/${userId}`,
  );
  return unwrap(response);
}

export async function getPaymentSummary() {
  const response = await paymentApiClient.get<PaymentApiResponse<PaymentSummary>>(
    '/payments/reports/summary',
  );
  return unwrap(response);
}

export async function mockPaymentSuccess(id: number) {
  const response = await paymentApiClient.post<PaymentApiResponse<Payment>>(
    `/payments/${id}/mock-success`,
  );
  return unwrap(response);
}

export async function verifyRazorpayPayment(request: VerifyRazorpayPaymentRequest) {
  const response = await paymentApiClient.post<PaymentApiResponse<Payment>>(
    '/payments/verify',
    request,
  );
  return unwrap(response);
}

export async function mockPaymentFailure({
  id,
  failureReason,
}: {
  id: number;
  failureReason: string;
}) {
  const response = await paymentApiClient.post<PaymentApiResponse<Payment>>(
    `/payments/${id}/mock-failure`,
    { failureReason },
  );
  return unwrap(response);
}