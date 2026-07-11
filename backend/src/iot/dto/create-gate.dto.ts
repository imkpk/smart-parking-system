import { GateDirection } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGateDto {
  @IsInt()
  @Type(() => Number)
  parkingLotId!: number;

  @IsString()
  @MinLength(1)
  externalId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(GateDirection)
  direction?: GateDirection;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  autoOpenEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  anprConfidenceThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duplicateWindowSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  commandTtlSeconds?: number;
}