import { Module } from '@nestjs/common';
import { ParkingLotsModule } from '../parking-lots/parking-lots.module';
import { SlotLifecycleService } from './slot-lifecycle.service';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [ParkingLotsModule],
  controllers: [SlotsController],
  providers: [SlotsService, SlotLifecycleService],
  exports: [SlotLifecycleService],
})
export class SlotsModule {}
