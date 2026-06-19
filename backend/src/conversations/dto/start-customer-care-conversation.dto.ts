import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class StartCustomerCareConversationDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bookingId?: number;

  @IsString()
  message: string;
}