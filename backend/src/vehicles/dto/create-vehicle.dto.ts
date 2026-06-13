import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'TS09EA1234' })
  @IsString()
  vehicleNumber: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.CAR })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiPropertyOptional({ example: 'Hyundai' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Creta' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'White' })
  @IsOptional()
  @IsString()
  color?: string;
}
