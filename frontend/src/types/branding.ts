export interface TenantBrandingResponse {
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  loginTitle?: string | null;
  supportEmail?: string | null;
}

export interface TenantBranding {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  loginTitle?: string | null;
  supportEmail?: string | null;
}

export interface UpdateTenantBrandingPayload {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  loginTitle?: string | null;
  supportEmail?: string | null;
}