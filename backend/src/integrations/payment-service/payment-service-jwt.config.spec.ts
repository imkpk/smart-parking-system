import {
  resolvePaymentServiceJwtConfig,
  validatePaymentServiceJwtConfig,
} from './payment-service-jwt.config';

describe('payment-service-jwt.config', () => {
  it('resolves payment service JWT config with defaults', () => {
    expect(
      resolvePaymentServiceJwtConfig({
        PAYMENT_SERVICE_JWT_SECRET: 'payment_service_jwt_secret_32_chars_min',
        PAYMENT_SERVICE_JWT_ISSUER: 'issuer',
        PAYMENT_SERVICE_JWT_AUDIENCE: 'audience',
        PAYMENT_SERVICE_TOKEN_TTL_SECONDS: '120',
        IOT_ENABLED: 'false',
      }),
    ).toEqual({
      secret: 'payment_service_jwt_secret_32_chars_min',
      issuer: 'issuer',
      audience: 'audience',
      tokenTtlSeconds: 120,
    });
  });

  it('skips validation when IoT is disabled', () => {
    expect(() =>
      validatePaymentServiceJwtConfig(
        resolvePaymentServiceJwtConfig({ IOT_ENABLED: 'false' }),
        false,
      ),
    ).not.toThrow();
  });

  it('requires JWT secret when IoT is enabled', () => {
    expect(() =>
      validatePaymentServiceJwtConfig(
        resolvePaymentServiceJwtConfig({
          IOT_ENABLED: 'true',
          PAYMENT_SERVICE_JWT_ISSUER: 'issuer',
          PAYMENT_SERVICE_JWT_AUDIENCE: 'audience',
        }),
        true,
      ),
    ).toThrow(
      'PAYMENT_SERVICE_JWT_SECRET must be at least 32 characters when IOT_ENABLED=true',
    );
  });

  it('requires issuer and audience when IoT is enabled', () => {
    expect(() =>
      validatePaymentServiceJwtConfig(
        {
          secret: 'payment_service_jwt_secret_32_chars_min',
          issuer: '',
          audience: 'audience',
          tokenTtlSeconds: 60,
        },
        true,
      ),
    ).toThrow('PAYMENT_SERVICE_JWT_ISSUER is required when IOT_ENABLED=true');

    expect(() =>
      validatePaymentServiceJwtConfig(
        {
          secret: 'payment_service_jwt_secret_32_chars_min',
          issuer: 'issuer',
          audience: '   ',
          tokenTtlSeconds: 60,
        },
        true,
      ),
    ).toThrow('PAYMENT_SERVICE_JWT_AUDIENCE is required when IOT_ENABLED=true');
  });
});