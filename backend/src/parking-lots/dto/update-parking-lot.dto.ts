import { PartialType } from '@nestjs/swagger';
import { CreateParkingLotDto } from './create-parking-lot.dto';

export class UpdateParkingLotDto extends PartialType(CreateParkingLotDto) {}
