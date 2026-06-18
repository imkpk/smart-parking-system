/// <reference types="jest" />

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SlotStatus, SlotType } from '@prisma/client';
import { AccessPolicyService } from './common/access-policy.service';
import { ParkingLotValidationService } from './parking-lots/parking-lot-validation.service';
import { SlotsService } from './slots/slots.service';
import { org2 } from './test/test-tenant-fixtures';
import {
  adminUser,
  normalUser,
  securityUser,
  superAdminUser,
  tenantAdminUser,
} from './test/test-users';

describe('Phase 4 visual slot map acceptance', () => {
  const accessPolicy = new AccessPolicyService();

  const createService = (prisma: Record<string, unknown>) =>
    new SlotsService(
      prisma as never,
      new ParkingLotValidationService(prisma as never),
      accessPolicy,
    );

  const occupiedSlot = {
    id: 21,
    slotNumber: 'A-02',
    slotType: SlotType.CAR,
    status: SlotStatus.OCCUPIED,
    floor: { id: 10, name: 'Level 1', level: 1 },
    bookings: [],
    events: [
      {
        id: 301,
        checkInTime: new Date('2026-06-19T08:00:00.000Z'),
        bookingId: 201,
        booking: { id: 201, bookingCode: 'BK-ORG1' },
        vehicle: { vehicleNumber: 'TS09EA1234' },
      },
    ],
  };

  const basePrisma = {
    parkingLot: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Org1 Lot',
        isActive: true,
      }),
    },
    floor: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 10,
          name: 'Level 1',
          level: 1,
          _count: { slots: 1 },
        },
      ]),
    },
    slot: {
      findMany: jest.fn().mockResolvedValue([occupiedSlot]),
    },
  };

  it('returns tenant admin slot map with operational occupancy details', async () => {
    const service = createService(basePrisma);

    const result = await service.getSlotMap(1, tenantAdminUser);

    expect(result.parkingLot.name).toBe('Org1 Lot');
    expect(result.legend.OCCUPIED).toBe(1);
    expect(result.groups[0].slots[0].occupancy?.vehicleNumber).toBe('TS09EA1234');
    expect(result.groups[0].slots[0].occupancy?.bookingCode).toBe('BK-ORG1');
  });

  it('returns security operational map with vehicle and booking code', async () => {
    const service = createService(basePrisma);

    const result = await service.getSlotMap(1, securityUser);

    expect(result.groups[0].slots[0].occupancy?.vehicleNumber).toBe('TS09EA1234');
    expect(result.groups[0].slots[0].occupancy?.bookingCode).toBe('BK-ORG1');
  });

  it('returns user-safe occupancy without vehicle or booking code', async () => {
    const service = createService(basePrisma);

    const result = await service.getSlotMap(1, normalUser);

    expect(result.groups[0].slots[0].occupancy).toEqual({
      state: 'OCCUPIED',
      bookingId: 201,
      eventId: 301,
      checkedInAt: '2026-06-19T08:00:00.000Z',
    });
    expect(result.groups[0].slots[0].occupancy?.vehicleNumber).toBeUndefined();
    expect(result.groups[0].slots[0].occupancy?.bookingCode).toBeUndefined();
  });

  it('blocks cross-tenant slot map access', async () => {
    const prisma = {
      ...basePrisma,
      parkingLot: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = createService(prisma);

    await expect(service.getSlotMap(org2.parkingLot.id, adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('requires organization context for super admin', async () => {
    const service = createService(basePrisma);

    await expect(service.getSlotMap(1, superAdminUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('scopes slot map queries to the caller organization', async () => {
    const prisma = {
      parkingLot: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 1, name: 'Org1 Lot', isActive: true })
          .mockResolvedValueOnce({ id: 2, name: 'Org2 Lot', isActive: true }),
      },
      floor: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10,
            name: 'Level 1',
            level: 1,
            _count: { slots: 1 },
          },
        ]),
      },
      slot: {
        findMany: jest.fn().mockResolvedValue([occupiedSlot]),
      },
    };
    const service = createService(prisma);

    await service.getSlotMap(1, adminUser);
    await service.getSlotMap(org2.parkingLot.id, org2.adminUser);

    expect(prisma.slot.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          floor: expect.objectContaining({
            parkingLot: expect.objectContaining({ organizationId: 1 }),
          }),
        }),
      }),
    );
    expect(prisma.slot.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          floor: expect.objectContaining({
            parkingLot: expect.objectContaining({ organizationId: 2 }),
          }),
        }),
      }),
    );
  });

  it('applies floor, status, and vehicle type filters', async () => {
    const prisma = { ...basePrisma, slot: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = createService(prisma);

    await service.getSlotMap(1, adminUser, {
      floorId: 10,
      status: SlotStatus.AVAILABLE,
      vehicleType: SlotType.EV,
    });

    expect(prisma.slot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          floor: expect.objectContaining({ id: 10 }),
          status: SlotStatus.AVAILABLE,
          slotType: SlotType.EV,
        }),
      }),
    );
  });

  it('returns controlled empty response when no slots match filters', async () => {
    const prisma = { ...basePrisma, slot: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = createService(prisma);

    const result = await service.getSlotMap(1, adminUser, { floorId: 999 });

    expect(result.groups).toEqual([]);
    expect(result.legend).toEqual({
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      MAINTENANCE: 0,
      UNKNOWN: 0,
    });
    expect(result.selectedFloorId).toBe(999);
  });
});