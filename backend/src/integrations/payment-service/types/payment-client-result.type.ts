export interface PaymentClientSuccess {
  paymentInitiated: true;
  payment: unknown;
}

export interface PaymentClientFailure {
  paymentInitiated: false;
  paymentError: string;
}

export type PaymentClientResult = PaymentClientSuccess | PaymentClientFailure;
