import { PaymentMethod } from '../types/payment-method.type';

export interface InitiatePaymentRequestDto {
  parkingEventId: number;
  bookingId: number;
  userId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
}