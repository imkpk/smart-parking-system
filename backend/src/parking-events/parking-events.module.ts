import { Module } from '@nestjs/common';
import { PaymentClientModule } from '../integrations/payment-service/payment-client.module';
import { SlotsModule } from '../slots/slots.module';
import { ParkingEventsController } from './parking-events.controller';
import { ParkingEventsService } from './parking-events.service';

@Module({
  imports: [PaymentClientModule, SlotsModule],
  controllers: [ParkingEventsController],
  providers: [ParkingEventsService],
})
export class ParkingEventsModule {}
