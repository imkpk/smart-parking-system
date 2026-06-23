import { NotFoundException } from '@nestjs/common';
import { ParkingLotType } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { adminUser } from '../test/test-users';
import { org1, org2 } from '../test/test-tenant-fixtures';
import { ParkingLotValidationService } from './parking-lot-validation.service';
import { ParkingLotsService } from './parking-lots.service';

describe('ParkingLotsService', () => {
  let service: ParkingLotsService;
  let prisma: {
    parkingLot: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const parkingLot = {
    id: 1,
    name: 'Green Apartments',
    type: ParkingLotType.APARTMENT,
    address: 'Main Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    isActive: true,
    organizationId: DEFAULT_ORGANIZATION_ID,
  };

  beforeEach(() => {
    prisma = {
      parkingLot: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    const usageLimitsService = { checkLimit: jest.fn().mockResolvedValue(undefined) };
    service = new ParkingLotsService(
      prisma as never,
      parkingLotValidationService,
      new AccessPolicyService(),
      usageLimitsService as never,
    );
  });

  it('creates a parking lot', async () => {
    prisma.parkingLot.create.mockResolvedValue(parkingLot);

    const result = await service.create(adminUser, {
      name: parkingLot.name,
      type: parkingLot.type,
      address: parkingLot.address,
      city: parkingLot.city,
      state: parkingLot.state,
      pincode: parkingLot.pincode,
      isActive: parkingLot.isActive,
    });

    expect(prisma.parkingLot.create).toHaveBeenCalledWith({
      data: {
        name: parkingLot.name,
        type: parkingLot.type,
        address: parkingLot.address,
        city: parkingLot.city,
        state: parkingLot.state,
        pincode: parkingLot.pincode,
        isActive: parkingLot.isActive,
        organization: { connect: { id: DEFAULT_ORGANIZATION_ID } },
      },
    });
    expect(result).toBe(parkingLot);
  });

  it('returns only active parking lots scoped to the current organization', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([org1.parkingLot]);

    const result = await service.findAll(adminUser);

    expect(prisma.parkingLot.findMany).toHaveBeenCalledWith({
      where: { isActive: true, organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual([org1.parkingLot]);
  });

  it('does not return parking lots from another organization', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([]);

    const result = await service.findAll(org2.adminUser);

    expect(prisma.parkingLot.findMany).toHaveBeenCalledWith({
      where: { isActive: true, organizationId: org2.organizationId },
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual([]);
  });

  it('soft deletes a parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(parkingLot);
    prisma.parkingLot.update.mockResolvedValue({ ...parkingLot, isActive: false });

    const result = await service.remove(parkingLot.id, adminUser);

    expect(prisma.parkingLot.update).toHaveBeenCalledWith({
      where: { id: parkingLot.id },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('updates an active parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(parkingLot);
    prisma.parkingLot.update.mockResolvedValue({ ...parkingLot, name: 'Updated Lot' });

    const result = await service.update(parkingLot.id, adminUser, { name: 'Updated Lot' });

    expect(prisma.parkingLot.update).toHaveBeenCalledWith({
      where: { id: parkingLot.id },
      data: { name: 'Updated Lot' },
    });
    expect(result.name).toBe('Updated Lot');
  });

  it('throws when parking lot is not active or missing', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findOne(404, adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });
});