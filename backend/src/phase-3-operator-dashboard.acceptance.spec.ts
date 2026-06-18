/// <reference types="jest" />

import { Role } from '@prisma/client';
import { AccessPolicyService } from './common/access-policy.service';
import { DashboardService } from './dashboard/dashboard.service';
import {
  DEFAULT_ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
} from './organizations/organizations.constants';
import { ParkingLotValidationService } from './parking-lots/parking-lot-validation.service';
import { org2 } from './test/test-tenant-fixtures';
import {
  adminUser,
  normalUser,
  securityUser,
  superAdminUser,
  tenantAdminUser,
} from './test/test-users';

describe('Phase 3 operator dashboard acceptance', () => {
  const accessPolicy = new AccessPolicyService();

  const createService = (prisma: Record<string, unknown>) =>
    new DashboardService(
      prisma as never,
      new ParkingLotValidationService(prisma as never),
      accessPolicy,
    );

  it('scopes tenant operator metrics to the caller organization', async () => {
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Default Organization' }) },
      booking: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      parkingEvent: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { feeAmount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      parkingLot: { findMany: jest.fn().mockResolvedValue([]) },
      slot: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = createService(prisma);

    await service.getOperatorMetrics(adminUser);
    await service.getOperatorMetrics(org2.adminUser);

    expect(prisma.booking.count).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(prisma.booking.count).toHaveBeenCalledWith({
      where: { organizationId: OTHER_ORGANIZATION_ID },
    });
  });

  it('returns platform scope for super admin without tenant organization context', async () => {
    const prisma = {
      organization: { count: jest.fn().mockResolvedValue(2) },
      user: { count: jest.fn().mockResolvedValue(10) },
      parkingLot: { count: jest.fn().mockResolvedValue(4) },
      slot: { count: jest.fn().mockResolvedValue(50), groupBy: jest.fn().mockResolvedValue([]) },
      parkingEvent: { count: jest.fn().mockResolvedValue(0) },
      booking: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = createService(prisma);

    const metrics = await service.getOperatorMetrics(superAdminUser);

    expect(metrics.scope).toBe('PLATFORM');
    expect(metrics.role).toBe(Role.SUPER_ADMIN);
    expect(metrics.platformOverview).toEqual({
      totalOrganizations: 2,
      totalUsers: 10,
      totalParkingLots: 4,
      totalSlots: 50,
    });
  });

  it('excludes revenue from security operator metrics', async () => {
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Default Organization' }) },
      booking: { count: jest.fn().mockResolvedValue(3) },
      parkingEvent: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      slot: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = createService(prisma);

    const metrics = await service.getOperatorMetrics(securityUser);

    expect(metrics.scope).toBe('TENANT');
    expect(metrics.role).toBe(Role.SECURITY);
    expect(metrics.revenue).toBeNull();
    expect(metrics.lotUtilization).toEqual([]);
  });

  it('returns user-scoped personal overview for USER role', async () => {
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Default Organization' }) },
      vehicle: { count: jest.fn().mockResolvedValue(2) },
      booking: { count: jest.fn().mockResolvedValue(1) },
      parkingEvent: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = createService(prisma);

    const metrics = await service.getOperatorMetrics(normalUser);

    expect(metrics.scope).toBe('USER');
    expect(metrics.userOverview).toEqual({
      totalVehicles: 2,
      upcomingBookings: 1,
      activeParkingEvents: 0,
      completedParkingEvents: 0,
    });
    expect(metrics.occupancy).toBeNull();
    expect(metrics.revenue).toBeNull();
  });

  it('returns tenant operator metrics for tenant admin', async () => {
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Default Organization' }) },
      booking: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      parkingEvent: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { feeAmount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      parkingLot: { findMany: jest.fn().mockResolvedValue([]) },
      slot: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = createService(prisma);

    const metrics = await service.getOperatorMetrics(tenantAdminUser);

    expect(metrics.scope).toBe('TENANT');
    expect(metrics.role).toBe(Role.TENANT_ADMIN);
    expect(metrics.revenue).not.toBeNull();
  });
});