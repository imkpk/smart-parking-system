import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  PaymentServiceJwtConfig,
  resolvePaymentServiceJwtConfig,
} from './payment-service-jwt.config';

export type ServicePaymentJwtClaims = {
  organizationId: number;
  trigger: 'iot-checkout';
};

@Injectable()
export class PaymentServiceJwtService {
  private readonly config: PaymentServiceJwtConfig;

  constructor(private readonly jwtService: JwtService) {
    this.config = resolvePaymentServiceJwtConfig();
  }

  signInitiateToken(claims: ServicePaymentJwtClaims): string {
    return this.jwtService.sign(
      {
        sub: 'smart-parking-backend',
        token_type: 'service',
        scope: ['payment:initiate'],
        organizationId: claims.organizationId,
        trigger: claims.trigger,
        jti: randomUUID(),
      },
      {
        issuer: this.config.issuer,
        audience: this.config.audience,
        expiresIn: this.config.tokenTtlSeconds,
      },
    );
  }
}