import { DEFAULT_BRANDING, DEFAULT_LOGIN_TITLE } from '../constants/defaultBranding';
import { ThemeBrandOverrides } from '../theme/tokens';
import { TenantBranding, TenantBrandingResponse } from '../types/branding';

export function mergeTenantBranding(
  response?: TenantBrandingResponse | null,
): TenantBranding {
  if (!response) {
    return DEFAULT_BRANDING;
  }

  return {
    name: response.name || DEFAULT_BRANDING.name,
    slug: response.slug,
    logoUrl: response.logoUrl ?? null,
    primaryColor: response.primaryColor ?? null,
    secondaryColor: response.secondaryColor ?? null,
    accentColor: response.accentColor ?? null,
    loginTitle: response.loginTitle ?? DEFAULT_LOGIN_TITLE,
    supportEmail: response.supportEmail ?? null,
  };
}

export function toThemeBrandOverrides(branding: TenantBranding): ThemeBrandOverrides {
  return {
    name: branding.name,
    ...(branding.primaryColor ? { primary: branding.primaryColor } : {}),
    ...(branding.secondaryColor ? { secondary: branding.secondaryColor } : {}),
    ...(branding.accentColor ? { accent: branding.accentColor } : {}),
  };
}