import { describe, expect, it } from 'vitest';
import { getRoleHomePath } from '@/lib/routes';

describe('getRoleHomePath', () => {
  it('returns admin dashboard for ADMIN', () => {
    expect(getRoleHomePath('ADMIN')).toBe('/admin/dashboard');
  });

  it('returns security dashboard for SECURITY', () => {
    expect(getRoleHomePath('SECURITY')).toBe('/security/dashboard');
  });

  it('returns user dashboard for USER', () => {
    expect(getRoleHomePath('USER')).toBe('/user/dashboard');
  });
});