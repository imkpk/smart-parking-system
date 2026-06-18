/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AccessPolicyService } from './common/access-policy.service';
import { DashboardService } from './dashboard/dashboard.service';
import { encodeRecentActivityCursor } from './dashboard/recent-activity-cursor';
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
} from './test/test-users';

describe('Phase 3D dashboard polish acceptance', () => {
  const accessPolicy = new AccessPolicyService();

  const createService = (prisma: Record<string, unknown>) =>
    new DashboardService(
      prisma as never,
      new ParkingLotValidationService(prisma as never),
      accessPolicy,
    );

  const sampleEvents = [
    {
      id: 10,
      status: 'ACTIVE',
      checkInTime: new Date('2026-06-18T12:00:00.000Z'),
      checkOutTime: null,
      vehicle: { vehicleNumber: 'TS09EA1234' },
      slot: { slotNumber: 'A-01', floor: { name: 'Ground' } },
      parkingLot: { name: 'Lot A' },
    },
    {
      id: 9,
      status: 'COMPLETED',
      checkInTime: new Date('2026-06-18T11:00:00.000Z'),
      checkOutTime: new Date('2026-06-18T11:30:00.000Z'),
      vehicle: { vehicleNumber: 'TS09EA5678' },
      slot: { slotNumber: 'B-02', floor: { name: 'Level 1' } },
      parkingLot: { name: 'Lot B' },
    },
    {
      id: 8,
      status: 'COMPLETED',
      checkInTime: new Date('2026-06-18T10:00:00.000Z'),
      checkOutTime: new Date('2026-06-18T10:45:00.000Z'),
      vehicle: { vehicleNumber: 'TS09EA9999' },
      slot: { slotNumber: 'C-03', floor: { name: 'Level 2' } },
      parkingLot: { name: 'Lot C' },
    },
  ];

  it('scopes recent activity to the caller organization', async () => {
    const prisma = {
      parkingEvent: {
        findMany: jest.fn().mockResolvedValue(sampleEvents.slice(0, 2)),
      },
    };
    const service = createService(prisma);

    await service.getRecentActivity(adminUser, { limit: 5 });
    await service.getRecentActivity(org2.adminUser, { limit: 5 });

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: DEFAULT_ORGANIZATION_ID }),
        take: 6,
      }),
    );
    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: OTHER_ORGANIZATION_ID }),
      }),
    );
  });

  it('returns first page and next page using stable cursor pagination', async () => {
    const prisma = {
      parkingEvent: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(sampleEvents)
          .mockResolvedValueOnce([sampleEvents[2]]),
      },
    };
    const service = createService(prisma);

    const firstPage = await service.getRecentActivity(adminUser, { limit: 2 });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toEqual(
      encodeRecentActivityCursor({
        checkInTime: sampleEvents[1].checkInTime.toISOString(),
        id: sampleEvents[1].id,
      }),
    );

    const secondPage = await service.getRecentActivity(adminUser, {
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.nextCursor).toBeNull();
    expect(prisma.parkingEvent.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: DEFAULT_ORGANIZATION_ID,
          OR: [
            { checkInTime: { lt: sampleEvents[1].checkInTime } },
            {
              checkInTime: sampleEvents[1].checkInTime,
              id: { lt: sampleEvents[1].id },
            },
          ],
        }),
      }),
    );
  });

  it('bounds oversized recent activity limits safely', async () => {
    const prisma = {
      parkingEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = createService(prisma);

    await service.getRecentActivity(adminUser, { limit: 999 });

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 21 }),
    );
  });

  it('rejects invalid recent activity cursors', async () => {
    const prisma = {
      parkingEvent: { findMany: jest.fn() },
    };
    const service = createService(prisma);

    await expect(
      service.getRecentActivity(adminUser, { cursor: 'invalid-cursor' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps security and admin tenant access while user sees only own activity', async () => {
    const prisma = {
      parkingEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = createService(prisma);

    await service.getRecentActivity(securityUser, { limit: 5 });
    await service.getRecentActivity(normalUser, { limit: 5 });

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: DEFAULT_ORGANIZATION_ID },
      }),
    );
    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          userId: normalUser.id,
        },
      }),
    );
  });

  it('allows platform super admin to read cross-tenant recent activity', async () => {
    const prisma = {
      parkingEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = createService(prisma);

    await service.getRecentActivity(superAdminUser, { limit: 5 });

    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
    expect(superAdminUser.role).toBe(Role.SUPER_ADMIN);
  });
});