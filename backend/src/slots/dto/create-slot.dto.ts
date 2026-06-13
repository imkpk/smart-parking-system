import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlotStatus, SlotType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSlotDto {
  @ApiProperty({ example: 'B1-C-001' })
  @IsString()
  slotNumber: string;

  @ApiPropertyOptional({ enum: SlotType, example: SlotType.CAR })
  @IsOptional()
  @IsEnum(SlotType)
  slotType?: SlotType;

  @ApiPropertyOptional({ enum: SlotStatus, example: SlotStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
