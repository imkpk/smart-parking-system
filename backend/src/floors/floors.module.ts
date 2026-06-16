import { Module } from '@nestjs/common';
import { ParkingLotsModule } from '../parking-lots/parking-lots.module';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';

@Module({
  imports: [ParkingLotsModule],
  controllers: [FloorsController],
  providers: [FloorsService],
})
export class FloorsModule {}
