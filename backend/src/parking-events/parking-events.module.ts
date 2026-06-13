import { Module } from '@nestjs/common';
import { ParkingEventsController } from './parking-events.controller';
import { ParkingEventsService } from './parking-events.service';

@Module({
  controllers: [ParkingEventsController],
  providers: [ParkingEventsService],
})
export class ParkingEventsModule {}
