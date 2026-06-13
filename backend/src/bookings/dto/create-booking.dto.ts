import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  vehicleId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  slotId: number;

  @ApiProperty({ example: '2026-06-14T10:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: '2026-06-14T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;
}
