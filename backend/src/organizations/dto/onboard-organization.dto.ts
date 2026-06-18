import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OnboardOrganizationDetailsDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;
}

export class OnboardTenantAdminDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}

export class OnboardOrganizationDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => OnboardOrganizationDetailsDto)
  organization: OnboardOrganizationDetailsDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => OnboardTenantAdminDto)
  tenantAdmin: OnboardTenantAdminDto;
}
