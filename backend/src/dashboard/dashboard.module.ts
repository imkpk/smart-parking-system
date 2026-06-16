import { Module } from '@nestjs/common';
import { ParkingLotsModule } from '../parking-lots/parking-lots.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [ParkingLotsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
