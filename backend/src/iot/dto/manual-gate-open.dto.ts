import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ManualGateOpenDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonDetail?: string;
}