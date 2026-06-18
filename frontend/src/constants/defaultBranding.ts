import { brand } from '../theme/tokens';
import { TenantBranding } from '../types/branding';

export const DEFAULT_LOGIN_TITLE = 'Sign in';

export const DEFAULT_BRANDING: TenantBranding = {
  name: brand.name,
  loginTitle: DEFAULT_LOGIN_TITLE,
};