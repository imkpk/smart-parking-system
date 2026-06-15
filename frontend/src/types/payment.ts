export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'MOCK';

export interface Payment {
  id: number;
  parkingEventId: number;
  bookingId: number;
  userId: number;
  amount: number | string;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  totalPayments: number;
  successfulAmount: number | string;
  paymentsByStatus: Partial<Record<PaymentStatus, number>>;
}

export interface PaymentApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
