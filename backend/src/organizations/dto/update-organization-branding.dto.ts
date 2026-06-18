import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function emptyStringToNull({ value }: { value: unknown }) {
  return value === '' ? null : value;
}

export class UpdateOrganizationBrandingDto {
  @IsOptional()
  @Transform(emptyStringToNull)
  @ValidateIf((_, value) => value != null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string | null;

  @IsOptional()
  @Transform(emptyStringToNull)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(HEX_COLOR_PATTERN, { message: 'primaryColor must be a valid hex color (#RRGGBB)' })
  primaryColor?: string | null;

  @IsOptional()
  @Transform(emptyStringToNull)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(HEX_COLOR_PATTERN, { message: 'secondaryColor must be a valid hex color (#RRGGBB)' })
  secondaryColor?: string | null;

  @IsOptional()
  @Transform(emptyStringToNull)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(HEX_COLOR_PATTERN, { message: 'accentColor must be a valid hex color (#RRGGBB)' })
  accentColor?: string | null;

  @IsOptional()
  @Transform(emptyStringToNull)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(120)
  loginTitle?: string | null;

  @IsOptional()
  @Transform(emptyStringToNull)
  @ValidateIf((_, value) => value != null)
  @IsEmail()
  @MaxLength(254)
  supportEmail?: string | null;
}