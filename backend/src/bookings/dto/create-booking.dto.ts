import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  vehicleId: number;

  @Type(() => Number)
  @IsInt()
  slotId: number;

  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;
}
