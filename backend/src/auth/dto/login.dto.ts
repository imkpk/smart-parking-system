import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Email address or Indian mobile number (10 digits or +91XXXXXXXXXX). */
  @IsString()
  @MinLength(3)
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}