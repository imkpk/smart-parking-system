import { Module } from '@nestjs/common';
import { PaymentClientService } from './payment-client.service';

@Module({
  providers: [PaymentClientService],
  exports: [PaymentClientService],
})
export class PaymentClientModule {}
