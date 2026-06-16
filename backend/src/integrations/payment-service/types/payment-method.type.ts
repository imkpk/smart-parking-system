export const PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'UPI',
  'WALLET',
  'MOCK',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];