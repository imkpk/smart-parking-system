import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DEFAULT_ORGANIZATION_ID, OTHER_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { adminUser, normalUser, securityUser } from '../test/test-users';
import { AccessPolicyService } from './access-policy.service';

describe('AccessPolicyService', () => {
  let service: AccessPolicyService;

  beforeEach(() => {
    service = new AccessPolicyService();
  });

  it('identifies roles', () => {
    expect(service.isAdmin(adminUser)).toBe(true);
    expect(service.isSecurity(securityUser)).toBe(true);
    expect(service.isUser(normalUser)).toBe(true);
    expect(service.isOperationalRole(securityUser)).toBe(true);
  });

  it('requires organization context', () => {
    expect(service.getRequiredOrganizationId(normalUser)).toBe(DEFAULT_ORGANIZATION_ID);
    expect(() =>
      service.getRequiredOrganizationId({ ...normalUser, organizationId: null }),
    ).toThrow(ForbiddenException);
  });

  it('checks organization access', () => {
    expect(service.canAccessOrganization(normalUser, DEFAULT_ORGANIZATION_ID)).toBe(true);
    expect(service.canAccessOrganization(normalUser, OTHER_ORGANIZATION_ID)).toBe(false);
    expect(service.canAccessOrganization({ ...normalUser, organizationId: null }, 1)).toBe(false);
  });

  it('asserts same organization access', () => {
    expect(() =>
      service.assertSameOrganization(normalUser, DEFAULT_ORGANIZATION_ID),
    ).not.toThrow();
    expect(() =>
      service.assertSameOrganization(normalUser, OTHER_ORGANIZATION_ID),
    ).toThrow(ForbiddenException);
  });

  it('builds organization-scoped where clauses', () => {
    expect(service.buildOrganizationWhere(normalUser)).toEqual({
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
    expect(service.buildParkingLotOrganizationWhere(adminUser)).toEqual({
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
    expect(service.buildFloorOrganizationWhere(securityUser)).toEqual({
      parkingLot: { organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(service.buildSlotOrganizationWhere(normalUser)).toEqual({
      floor: {
        parkingLot: { organizationId: DEFAULT_ORGANIZATION_ID },
      },
    });
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
    expect(service.buildUserScopedWhere(normalUser)).toEqual({
      userId: normalUser.id,
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
    expect(service.buildUserScopedWhere(adminUser)).toEqual({
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
    expect(service.buildUserScopedWhere(securityUser)).toEqual({
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
  });
});