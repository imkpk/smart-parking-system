export type UserPaymentAuthContext = {
  type: 'user';
  authorizationHeader?: string;
};

export type SystemPaymentAuthContext = {
  type: 'system';
  organizationId: number;
  trigger: 'iot-checkout';
};

export type PaymentAuthContext = UserPaymentAuthContext | SystemPaymentAuthContext;