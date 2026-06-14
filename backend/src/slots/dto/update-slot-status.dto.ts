import { SlotStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSlotStatusDto {
  @IsEnum(SlotStatus)
  status: SlotStatus;
}
