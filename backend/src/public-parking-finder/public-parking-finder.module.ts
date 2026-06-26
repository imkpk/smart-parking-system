import { Module } from '@nestjs/common';
import { PublicParkingFinderController } from './public-parking-finder.controller';
import { PublicParkingFinderService } from './public-parking-finder.service';

@Module({
  controllers: [PublicParkingFinderController],
  providers: [PublicParkingFinderService],
})
export class PublicParkingFinderModule {}