import { Module } from '@nestjs/common';
import { SlotsModule } from '../slots/slots.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [SlotsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
