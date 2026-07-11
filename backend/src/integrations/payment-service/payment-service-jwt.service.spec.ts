import { JwtService } from '@nestjs/jwt';
import { PaymentServiceJwtService } from './payment-service-jwt.service';

describe('PaymentServiceJwtService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PAYMENT_SERVICE_JWT_SECRET: 'payment_service_jwt_secret_32_chars_min',
      PAYMENT_SERVICE_JWT_ISSUER: 'smart-parking-backend',
      PAYMENT_SERVICE_JWT_AUDIENCE: 'smart-parking-payment-service',
      PAYMENT_SERVICE_TOKEN_TTL_SECONDS: '90',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('signs service JWTs with required initiate claims', () => {
    const sign = jest.fn().mockReturnValue('signed-service-token');
    const service = new PaymentServiceJwtService({ sign } as unknown as JwtService);

    const token = service.signInitiateToken({
      organizationId: 42,
      trigger: 'iot-checkout',
    });

    expect(token).toBe('signed-service-token');
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'smart-parking-backend',
        token_type: 'service',
        scope: ['payment:initiate'],
        organizationId: 42,
        trigger: 'iot-checkout',
        jti: expect.any(String),
      }),
      {
        issuer: 'smart-parking-backend',
        audience: 'smart-parking-payment-service',
        expiresIn: 90,
      },
    );
  });
});