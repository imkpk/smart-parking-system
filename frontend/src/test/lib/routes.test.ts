import { describe, expect, it } from 'vitest';
import { getRoleHomePath } from '@/lib/routes';

describe('getRoleHomePath', () => {
  it('routes super admin users to the admin dashboard', () => {
    expect(getRoleHomePath('SUPER_ADMIN')).toBe('/platform/admin');
  });

  it('routes tenant admin users to the admin dashboard', () => {
    expect(getRoleHomePath('TENANT_ADMIN')).toBe('/admin/dashboard');
  });

  it('routes admin users to the admin dashboard', () => {
    expect(getRoleHomePath('ADMIN')).toBe('/admin/dashboard');
  });

  it('routes security users to the security dashboard', () => {
    expect(getRoleHomePath('SECURITY')).toBe('/security/dashboard');
  });

  it('routes regular users to the user dashboard', () => {
    expect(getRoleHomePath('USER')).toBe('/user/dashboard');
  });
});