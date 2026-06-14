import { VehicleType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  vehicleNumber: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
