import { NotFoundException } from '@nestjs/common';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { FloorsService } from './floors.service';

describe('FloorsService', () => {
  let service: FloorsService;
  let prisma: {
    $transaction: jest.Mock;
    floor: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
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
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      parkingLot: { findFirst: jest.fn() },
    };
    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    service = new FloorsService(prisma as never, parkingLotValidationService);
  });

  it('creates a floor under an active parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, isActive: true });
    prisma.floor.create.mockResolvedValue({ id: 10, parkingLotId: 1, name: 'Basement 1', level: -1 });

    const result = await service.create(1, { name: 'Basement 1', level: -1 });

    expect(prisma.floor.create).toHaveBeenCalledWith({
      data: { name: 'Basement 1', level: -1, parkingLotId: 1 },
    });
    expect(result.id).toBe(10);
  });

  it('throws when creating a floor under a missing parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.create(404, { name: 'Basement 1', level: -1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists floors for an active parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, isActive: true });
    prisma.floor.findMany.mockResolvedValue([{ id: 10, level: -1 }]);

    const result = await service.findByParkingLot(1);

    expect(prisma.floor.findMany).toHaveBeenCalledWith({
      where: { parkingLotId: 1 },
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('throws when listing floors under a missing parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findByParkingLot(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing floor', async () => {
    prisma.floor.findUnique.mockResolvedValue({ id: 10 });
    prisma.floor.update.mockResolvedValue({ id: 10, name: 'Ground Floor', level: 0 });

    const result = await service.update(10, { name: 'Ground Floor', level: 0 });

    expect(prisma.floor.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { name: 'Ground Floor', level: 0 },
    });
    expect(result.name).toBe('Ground Floor');
  });

  it('deletes an existing floor', async () => {
    prisma.floor.findUnique.mockResolvedValue({ id: 10 });
    prisma.floor.delete.mockResolvedValue({ id: 10 });

    const result = await service.remove(10);

    expect(prisma.floor.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(result.id).toBe(10);
  });

  it('throws when updating a missing floor', async () => {
    prisma.floor.findUnique.mockResolvedValue(null);

    await expect(service.update(404, { name: 'Missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
