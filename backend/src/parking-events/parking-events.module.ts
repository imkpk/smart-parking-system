import { Module } from '@nestjs/common';
import { PaymentClientModule } from '../integrations/payment-service/payment-client.module';
import { ParkingEventsController } from './parking-events.controller';
import { ParkingEventsService } from './parking-events.service';

@Module({
  imports: [PaymentClientModule],
  controllers: [ParkingEventsController],
  providers: [ParkingEventsService],
})
export class ParkingEventsModule {}
