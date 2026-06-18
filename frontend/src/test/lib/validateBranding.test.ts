import { describe, expect, it } from 'vitest';
import { validateBrandingForm } from '@/lib/validateBranding';

describe('validateBrandingForm', () => {
  it('accepts valid branding values', () => {
    expect(
      validateBrandingForm({
        logoUrl: 'https://cdn.example.com/logo.svg',
        primaryColor: '#112233',
        secondaryColor: '#445566',
        accentColor: '#778899',
        loginTitle: 'Welcome',
        supportEmail: 'help@example.com',
      }),
    ).toEqual({});
  });

  it('rejects invalid hex colors', () => {
    expect(validateBrandingForm({ primaryColor: 'blue' }).primaryColor).toMatch(/hex color/i);
  });

  it('rejects invalid support email', () => {
    expect(validateBrandingForm({ supportEmail: 'not-an-email' }).supportEmail).toMatch(/valid support email/i);
  });
});