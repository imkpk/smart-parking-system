import { PaymentResponseDto } from '../dto/payment-response.dto';

export interface PaymentClientSuccess {
  paymentInitiated: true;
  payment: PaymentResponseDto;
}

export interface PaymentClientFailure {
  paymentInitiated: false;
  paymentError: string;
}

export type PaymentClientResult = PaymentClientSuccess | PaymentClientFailure;