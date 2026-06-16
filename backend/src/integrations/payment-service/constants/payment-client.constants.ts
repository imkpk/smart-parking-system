export const PAYMENT_CLIENT_TIMEOUT_MS = 5000;

export const PAYMENT_ERRORS = {
  UNAVAILABLE: 'Payment service unavailable',
  TIMED_OUT: 'Payment service timed out',
  AUTHORIZATION_FAILED: 'Payment service authorization failed',
  INVALID_AMOUNT: 'Payment amount must be greater than zero',
} as const;