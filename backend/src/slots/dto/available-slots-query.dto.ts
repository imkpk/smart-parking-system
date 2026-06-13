import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class AvailableSlotsQueryDto {
  @ApiPropertyOptional({ enum: VehicleType, example: VehicleType.CAR })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}
