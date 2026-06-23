import { Module } from '@nestjs/common';
import { SlotsModule } from '../slots/slots.module';
import { UsageLimitsModule } from '../usage-limits/usage-limits.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [SlotsModule, UsageLimitsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
