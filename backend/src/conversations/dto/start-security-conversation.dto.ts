import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class StartSecurityConversationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parkingLotId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bookingId?: number;

  @IsString()
  message: string;
}