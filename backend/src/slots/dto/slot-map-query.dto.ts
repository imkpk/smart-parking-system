import { SlotStatus, SlotType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class SlotMapQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floorId?: number;

  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;

  @IsOptional()
  @IsEnum(SlotType)
  vehicleType?: SlotType;
}