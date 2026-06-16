export const PAYMENT_STATUSES = [
  'INITIATED',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];