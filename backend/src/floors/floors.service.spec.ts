import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { adminUser } from '../test/test-users';
import { org1, org2 } from '../test/test-tenant-fixtures';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { FloorsService } from './floors.service';

describe('FloorsService', () => {
  let service: FloorsService;
  let prisma: {
    $transaction: jest.Mock;
    floor: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    parkingLot: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      floor: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      parkingLot: { findFirst: jest.fn() },
    };
    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    service = new FloorsService(
      prisma as never,
      parkingLotValidationService,
      new AccessPolicyService(),
    );
  });

  it('creates a floor under an active parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, isActive: true, organizationId: DEFAULT_ORGANIZATION_ID });
    prisma.floor.create.mockResolvedValue({ id: 10, parkingLotId: 1, name: 'Basement 1', level: -1 });

    const result = await service.create(1, adminUser, { name: 'Basement 1', level: -1 });

    expect(prisma.floor.create).toHaveBeenCalledWith({
      data: { name: 'Basement 1', level: -1, parkingLotId: 1 },
    });
    expect(result.id).toBe(10);
  });

  it('maps duplicate floor prisma errors to conflict', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, isActive: true, organizationId: DEFAULT_ORGANIZATION_ID });
    prisma.floor.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['parkingLotId', 'name'] },
      }),
    );

    await expect(
      service.create(1, adminUser, { name: 'Basement 1', level: -1 }),
    ).rejects.toThrow('Floor already exists');
  });

  it('maps duplicate floor prisma errors during update', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 10 });
    prisma.floor.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['parkingLotId', 'name'] },
      }),
    );

    await expect(
      service.update(10, adminUser, { name: 'Basement 1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when creating a floor under a missing parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(
      service.create(404, adminUser, { name: 'Basement 1', level: -1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists floors for an active parking lot scoped to organization', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(org1.parkingLot);
    prisma.floor.findMany.mockResolvedValue([{ id: 10, level: -1 }]);

    const result = await service.findByParkingLot(1, adminUser);

    expect(prisma.floor.findMany).toHaveBeenCalledWith({
      where: { parkingLotId: 1, parkingLot: { organizationId: DEFAULT_ORGANIZATION_ID } },
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('cannot list floors for a parking lot in another organization', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findByParkingLot(org2.parkingLot.id, adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when listing floors under a missing parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findByParkingLot(404, adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing floor', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 10 });
    prisma.floor.update.mockResolvedValue({ id: 10, name: 'Ground Floor', level: 0 });

    const result = await service.update(10, adminUser, { name: 'Ground Floor', level: 0 });

    expect(prisma.floor.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { name: 'Ground Floor', level: 0 },
    });
    expect(result.name).toBe('Ground Floor');
  });

  it('deletes an existing floor', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 10 });
    prisma.floor.delete.mockResolvedValue({ id: 10 });

    const result = await service.remove(10, adminUser);

    expect(prisma.floor.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(result.id).toBe(10);
  });

  it('throws when updating a missing floor', async () => {
    prisma.floor.findFirst.mockResolvedValue(null);

    await expect(service.update(404, adminUser, { name: 'Missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});