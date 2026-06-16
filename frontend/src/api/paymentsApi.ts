import { createApiClient } from './createApiClient';
import { Payment, PaymentApiResponse, PaymentSummary } from '../types/payment';

export const paymentApiClient = createApiClient(
  import.meta.env.VITE_PAYMENT_API_BASE_URL ?? 'http://localhost:8081/api',
);

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
