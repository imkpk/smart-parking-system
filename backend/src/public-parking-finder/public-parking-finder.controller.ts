import { Controller, Get, Query } from '@nestjs/common';
import { PublicParkingFinderQueryDto } from './dto/public-parking-finder-query.dto';
import { PublicParkingFinderService } from './public-parking-finder.service';

@Controller('public/parking-finder')
export class PublicParkingFinderController {
  constructor(private readonly publicParkingFinderService: PublicParkingFinderService) {}

  @Get()
  findPublicLots(@Query() query: PublicParkingFinderQueryDto) {
    return this.publicParkingFinderService.findPublicLots(query);
  }
}