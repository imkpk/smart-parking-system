import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { adminUser, normalUser } from '../test/test-users';
import { AccessPolicyService } from './access-policy.service';

describe('AccessPolicyService', () => {
  let service: AccessPolicyService;
  const securityUser = { ...adminUser, id: 3, role: Role.SECURITY };

  beforeEach(() => {
    service = new AccessPolicyService();
  });

  it('identifies roles', () => {
    expect(service.isAdmin(adminUser)).toBe(true);
    expect(service.isSecurity(securityUser)).toBe(true);
    expect(service.isUser(normalUser)).toBe(true);
    expect(service.isOperationalRole(securityUser)).toBe(true);
  });

  it('allows owners to access their own resources', () => {
    expect(service.canAccessUserResource(normalUser, normalUser.id)).toBe(true);
    expect(service.canAccessUserResource(normalUser, 999)).toBe(false);
  });

  it('allows operational roles and owners to view user-owned records', () => {
    expect(service.canViewUserOwnedRecord(adminUser, 999)).toBe(true);
    expect(service.canViewUserOwnedRecord(securityUser, 999)).toBe(true);
    expect(service.canViewUserOwnedRecord(normalUser, normalUser.id)).toBe(true);
    expect(service.canViewUserOwnedRecord(normalUser, 999)).toBe(false);
  });

  it('asserts direct resource access for owners only', () => {
    expect(() =>
      service.assertCanAccessUserResource(normalUser, normalUser.id, 'Denied'),
    ).not.toThrow();
    expect(() =>
      service.assertCanAccessUserResource(normalUser, 999, 'Denied'),
    ).toThrow(ForbiddenException);
    expect(() =>
      service.assertCanAccessUserResource(adminUser, 999, 'Denied'),
    ).toThrow(ForbiddenException);
  });

  it('asserts owner or admin access', () => {
    expect(() =>
      service.assertOwnerOrAdmin(adminUser, 999, 'Denied'),
    ).not.toThrow();
    expect(() =>
      service.assertOwnerOrAdmin(normalUser, normalUser.id, 'Denied'),
    ).not.toThrow();
    expect(() =>
      service.assertOwnerOrAdmin(normalUser, 999, 'Denied'),
    ).toThrow(ForbiddenException);
  });

  it('asserts view access for operational roles and owners', () => {
    expect(() =>
      service.assertCanViewUserOwnedRecord(securityUser, 999, 'Denied'),
    ).not.toThrow();
    expect(() =>
      service.assertCanViewUserOwnedRecord(normalUser, 999, 'Denied'),
    ).toThrow(ForbiddenException);
  });

  it('builds user-scoped where clauses', () => {
    expect(service.buildUserScopedWhere(normalUser)).toEqual({ userId: normalUser.id });
    expect(service.buildUserScopedWhere(adminUser)).toEqual({});
    expect(service.buildUserScopedWhere(securityUser)).toEqual({});
  });
});