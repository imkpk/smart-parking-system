import { IotDeviceType, Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateIotDeviceDto {
  @IsInt()
  @Type(() => Number)
  gateId!: number;

  @IsString()
  @MinLength(1)
  externalDeviceId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(IotDeviceType)
  deviceType!: IotDeviceType;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}