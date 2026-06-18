/// <reference types="jest" />

import { ForbiddenException } from '@nestjs/common';
import { AccessPolicyService } from './common/access-policy.service';
import {
  DEFAULT_ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
} from './organizations/organizations.constants';
import { org1, org2 } from './test/test-tenant-fixtures';
import { adminUser, securityUser, superAdminUser } from './test/test-users';
import { UsersService } from './users/users.service';
import { VehiclesService } from './vehicles/vehicles.service';

describe('Phase 1 tenant isolation acceptance', () => {
  const accessPolicy = new AccessPolicyService();

  it('defines two distinct tenant organizations in fixtures', () => {
    expect(org1.organizationId).toBe(DEFAULT_ORGANIZATION_ID);
    expect(org2.organizationId).toBe(OTHER_ORGANIZATION_ID);
    expect(org1.organizationId).not.toBe(org2.organizationId);
    expect(org1.booking.bookingCode).not.toBe(org2.booking.bookingCode);
  });

  it('allows tenant users only within their organization context', () => {
    expect(accessPolicy.canAccessOrganization(adminUser, DEFAULT_ORGANIZATION_ID)).toBe(true);
    expect(accessPolicy.canAccessOrganization(adminUser, OTHER_ORGANIZATION_ID)).toBe(false);
    expect(accessPolicy.canAccessOrganization(securityUser, DEFAULT_ORGANIZATION_ID)).toBe(true);
    expect(accessPolicy.canAccessOrganization(securityUser, OTHER_ORGANIZATION_ID)).toBe(false);
  });

  it('supports platform super admin without required tenant organization', () => {
    expect(superAdminUser.organizationId).toBeNull();
    expect(() =>
      accessPolicy.getRequiredOrganizationId(superAdminUser),
    ).toThrow(ForbiddenException);
  });

  it('scopes user listing to the caller organization', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([org1.normalUser]),
      },
    };
    const service = new UsersService(prisma as never, accessPolicy);

    const users = await service.findAll(adminUser);

    expect(users).toHaveLength(1);
    expect(users[0]?.organizationId).toBe(DEFAULT_ORGANIZATION_ID);
    expect(users.some((user) => user.id === org2.normalUser.id)).toBe(false);
  });

  it('blocks admin vehicle reads for another organization', async () => {
    const prisma = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new VehiclesService(prisma as never, accessPolicy);

    await expect(
      service.findOneForAdmin(org2.vehicle.id, adminUser),
    ).rejects.toThrow('Vehicle not found');
    expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
      where: {
        id: org2.vehicle.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
  });
});