import { ParkingLotType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsEnum(ParkingLotType)
  organizationType: ParkingLotType;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'phone must be a valid Indian mobile number (+91XXXXXXXXXX)',
  })
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;
}