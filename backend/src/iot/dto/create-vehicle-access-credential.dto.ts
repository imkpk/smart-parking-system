import { VehicleCredentialType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateVehicleAccessCredentialDto {
  @IsInt()
  @Type(() => Number)
  vehicleId!: number;

  @IsEnum(VehicleCredentialType)
  credentialType!: VehicleCredentialType;

  @IsString()
  @MinLength(4)
  rawIdentifier!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}