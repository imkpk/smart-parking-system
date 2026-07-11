import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PaymentClientService } from './payment-client.service';
import { PaymentServiceJwtConfigValidator } from './payment-service-jwt.config.validator';
import { PaymentServiceJwtService } from './payment-service-jwt.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('PAYMENT_SERVICE_JWT_SECRET') ??
          'dev_payment_service_jwt_secret_32_chars',
        signOptions: {
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  providers: [
    PaymentClientService,
    PaymentServiceJwtService,
    PaymentServiceJwtConfigValidator,
  ],
  exports: [PaymentClientService],
})
export class PaymentClientModule {}