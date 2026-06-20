import { describe, expect, it } from 'vitest';
import { getRoleHomePath } from '@/lib/routes';
import { createMockOrganization, createMockUser } from '@/test/test-utils';

describe('Phase 1 frontend tenant context acceptance', () => {
  it('represents tenant-scoped user state with organization summary', () => {
    const organization = createMockOrganization({
      id: 2,
      name: 'Metro Mall',
      slug: 'metro-mall',
    });
    const user = createMockUser({
      role: 'TENANT_ADMIN',
      organizationId: 2,
      organization,
    });

    expect(user.organizationId).toBe(2);
    expect(user.organization).toEqual(organization);
  });

  it('handles platform users without tenant organization safely', () => {
    const user = createMockUser({
      role: 'SUPER_ADMIN',
      organizationId: null,
      organization: null,
    });

    expect(getRoleHomePath(user.role)).toBe('/platform/admin');
    expect(user.organizationId).toBeNull();
    expect(user.organization).toBeNull();
  });

  it('keeps default-org operational role redirects unchanged', () => {
    expect(getRoleHomePath('ADMIN')).toBe('/admin/dashboard');
    expect(getRoleHomePath('SECURITY')).toBe('/security/dashboard');
    expect(getRoleHomePath('USER')).toBe('/user/dashboard');
  });
});