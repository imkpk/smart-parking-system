import { UpdateTenantBrandingPayload } from '../types/branding';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBrandingForm(values: UpdateTenantBrandingPayload) {
  const errors: Partial<Record<keyof UpdateTenantBrandingPayload, string>> = {};

  if (values.logoUrl && !/^https?:\/\/.+/i.test(values.logoUrl)) {
    errors.logoUrl = 'Logo URL must start with http:// or https://';
  }

  for (const field of ['primaryColor', 'secondaryColor', 'accentColor'] as const) {
    const value = values[field];
    if (value && !HEX_COLOR_PATTERN.test(value)) {
      errors[field] = 'Enter a valid hex color (#RRGGBB)';
    }
  }

  if (values.loginTitle && values.loginTitle.length > 120) {
    errors.loginTitle = 'Login title must be 120 characters or fewer';
  }

  if (values.supportEmail && !EMAIL_PATTERN.test(values.supportEmail)) {
    errors.supportEmail = 'Enter a valid support email';
  }

  return errors;
}