import { Module } from '@nestjs/common';
import { UsageLimitsModule } from '../usage-limits/usage-limits.module';
import { ParkingLotValidationService } from './parking-lot-validation.service';
import { ParkingLotsController } from './parking-lots.controller';
import { ParkingLotsService } from './parking-lots.service';

@Module({
  imports: [UsageLimitsModule],
  controllers: [ParkingLotsController],
  providers: [ParkingLotsService, ParkingLotValidationService],
  exports: [ParkingLotValidationService],
})
export class ParkingLotsModule {}
