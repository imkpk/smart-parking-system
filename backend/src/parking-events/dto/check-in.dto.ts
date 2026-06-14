import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bookingId?: number;

  @IsOptional()
  @IsString()
  bookingCode?: string;
}
