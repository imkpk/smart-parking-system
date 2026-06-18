import { describe, expect, it } from 'vitest';
import { DEFAULT_BRANDING } from '@/constants/defaultBranding';
import { mergeTenantBranding, toThemeBrandOverrides } from '@/lib/branding';
import { validateBrandingForm } from '@/lib/validateBranding';
import { getRoleHomePath } from '@/lib/routes';

describe('Phase 2 white-label branding acceptance', () => {
  it('merges tenant A and tenant B branding independently', () => {
    const tenantA = mergeTenantBranding({
      name: 'Tenant A Parking',
      slug: 'tenant-a',
      primaryColor: '#111111',
      loginTitle: 'Welcome to A',
    });
    const tenantB = mergeTenantBranding({
      name: 'Tenant B Parking',
      slug: 'tenant-b',
      primaryColor: '#222222',
      loginTitle: 'Welcome to B',
    });

    expect(tenantA.name).toBe('Tenant A Parking');
    expect(tenantB.name).toBe('Tenant B Parking');
    expect(tenantA.primaryColor).not.toBe(tenantB.primaryColor);
    expect(tenantA.loginTitle).not.toBe(tenantB.loginTitle);
  });

  it('falls back to safe default branding when tenant branding is missing', () => {
    expect(mergeTenantBranding(null)).toEqual(DEFAULT_BRANDING);
    expect(validateBrandingForm({ primaryColor: 'invalid' }).primaryColor).toBeTruthy();
  });

  it('maps tenant branding to theme overrides without breaking defaults', () => {
    const overrides = toThemeBrandOverrides(
      mergeTenantBranding({
        name: 'Tenant A Parking',
        slug: 'tenant-a',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        accentColor: '#333333',
      }),
    );

    expect(overrides).toEqual({
      name: 'Tenant A Parking',
      primary: '#111111',
      secondary: '#222222',
      accent: '#333333',
    });
  });

  it('keeps operational role redirects unchanged for default demo', () => {
    expect(getRoleHomePath('ADMIN')).toBe('/admin/dashboard');
    expect(getRoleHomePath('TENANT_ADMIN')).toBe('/admin/dashboard');
    expect(getRoleHomePath('SECURITY')).toBe('/security/dashboard');
    expect(getRoleHomePath('USER')).toBe('/user/dashboard');
  });
});