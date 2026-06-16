import { Module } from '@nestjs/common';
import { ParkingLotValidationService } from './parking-lot-validation.service';
import { ParkingLotsController } from './parking-lots.controller';
import { ParkingLotsService } from './parking-lots.service';

@Module({
  controllers: [ParkingLotsController],
  providers: [ParkingLotsService, ParkingLotValidationService],
  exports: [ParkingLotValidationService],
})
export class ParkingLotsModule {}
