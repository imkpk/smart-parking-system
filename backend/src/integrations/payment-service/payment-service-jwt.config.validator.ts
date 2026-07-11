import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  resolvePaymentServiceJwtConfig,
  validatePaymentServiceJwtConfig,
} from './payment-service-jwt.config';

@Injectable()
export class PaymentServiceJwtConfigValidator implements OnModuleInit {
  onModuleInit(): void {
    const config = resolvePaymentServiceJwtConfig();
    validatePaymentServiceJwtConfig(config);
  }
}