import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParkingLotType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateParkingLotDto {
  @ApiProperty({ example: 'Block A Parking' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ParkingLotType, example: ParkingLotType.APARTMENT })
  @IsEnum(ParkingLotType)
  type: ParkingLotType;

  @ApiPropertyOptional({ example: 'Apartment main gate, basement entry' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Hyderabad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Telangana' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '500081' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
