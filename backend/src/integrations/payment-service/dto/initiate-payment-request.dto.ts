export interface InitiatePaymentRequestDto {
  parkingEventId: number;
  bookingId: number;
  userId: number;
  amount: number;
  currency: string;
  paymentMethod: 'MOCK';
}
