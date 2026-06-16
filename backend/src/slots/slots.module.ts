import { Module } from '@nestjs/common';
import { SlotLifecycleService } from './slot-lifecycle.service';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  controllers: [SlotsController],
  providers: [SlotsService, SlotLifecycleService],
  exports: [SlotLifecycleService],
})
export class SlotsModule {}
