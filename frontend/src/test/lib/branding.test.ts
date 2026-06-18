import { describe, expect, it } from 'vitest';
import { DEFAULT_BRANDING } from '@/constants/defaultBranding';
import { mergeTenantBranding, toThemeBrandOverrides } from '@/lib/branding';

describe('branding helpers', () => {
  it('returns default branding when response is missing', () => {
    expect(mergeTenantBranding(null)).toEqual(DEFAULT_BRANDING);
  });

  it('merges API branding with defaults', () => {
    expect(
      mergeTenantBranding({
        name: 'Acme Parking',
        slug: 'acme-parking',
        primaryColor: '#112233',
        logoUrl: null,
        loginTitle: null,
      }),
    ).toEqual({
      name: 'Acme Parking',
      slug: 'acme-parking',
      logoUrl: null,
      primaryColor: '#112233',
      secondaryColor: null,
      accentColor: null,
      loginTitle: 'Sign in',
      supportEmail: null,
    });
  });

  it('maps branding to theme overrides', () => {
    expect(
      toThemeBrandOverrides({
        name: 'Acme Parking',
        primaryColor: '#112233',
        secondaryColor: '#445566',
        accentColor: '#778899',
      }),
    ).toEqual({
      name: 'Acme Parking',
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    });
  });
});