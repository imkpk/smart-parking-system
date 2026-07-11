import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SimulateDetectionDto {
  @IsString()
  @MinLength(1)
  externalDeviceId!: string;

  @IsString()
  @MinLength(1)
  messageId!: string;

  @IsString()
  identifierType!: 'PLATE' | 'UHF_RFID' | 'QR_CODE';

  @IsString()
  @MinLength(1)
  identifier!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  deviceAuth?: string;
}