import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const RECENT_ACTIVITY_DEFAULT_LIMIT = 5;
export const RECENT_ACTIVITY_MAX_LIMIT = 20;

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
}