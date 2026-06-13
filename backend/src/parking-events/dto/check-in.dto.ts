import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bookingId?: number;

  @ApiPropertyOptional({ example: 'BK-1781389000000-ABC123' })
  @IsOptional()
  @IsString()
  bookingCode?: string;
}
