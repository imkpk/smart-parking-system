import { SlotStatus, SlotType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  slotNumber: string;

  @IsOptional()
  @IsEnum(SlotType)
  slotType?: SlotType;

  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
