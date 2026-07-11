import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ManualGateOpenDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  @Matches(/\S/, { message: 'reason must contain non-whitespace characters' })
  reason!: string;
}