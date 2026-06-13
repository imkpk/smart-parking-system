import { ApiProperty } from '@nestjs/swagger';
import { SlotStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSlotStatusDto {
  @ApiProperty({ enum: SlotStatus, example: SlotStatus.MAINTENANCE })
  @IsEnum(SlotStatus)
  status: SlotStatus;
}
