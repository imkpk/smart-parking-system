import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const RECENT_ACTIVITY_DEFAULT_LIMIT = 5;
export const RECENT_ACTIVITY_MAX_LIMIT = 20;
export const RECENT_ACTIVITY_MAX_SEARCH_LENGTH = 80;

export class RecentActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RECENT_ACTIVITY_MAX_LIMIT)
  limit?: number = RECENT_ACTIVITY_DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(RECENT_ACTIVITY_MAX_SEARCH_LENGTH)
  q?: string;
}