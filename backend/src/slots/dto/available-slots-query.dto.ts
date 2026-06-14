import { VehicleType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class AvailableSlotsQueryDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}
