import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRfidAccessCredentialDto {
  @IsString()
  @MinLength(4)
  rfidTag!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}