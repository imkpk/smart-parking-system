import { PaymentMethod } from '../types/payment-method.type';
import { PaymentStatus } from '../types/payment-status.type';

export interface PaymentResponseDto {
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