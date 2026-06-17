import { Payment } from '../types/payment';

export function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 10,
    parkingEventId: 1,
    bookingId: 1,
    userId: 1,
    amount: 80,
    currency: 'INR',
    status: 'INITIATED',
    paymentMethod: 'MOCK',
    provider: 'MOCK',
    gatewayOrderId: null,
    gatewayStatus: null,
    providerReference: null,
    failureReason: null,
    createdAt: '2026-06-17T10:00:00',
    updatedAt: '2026-06-17T10:00:00',
    ...overrides,
  };
}