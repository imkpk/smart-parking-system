import { NotFoundException } from '@nestjs/common';
import { ParkingLotType } from '@prisma/client';
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
    service = new ParkingLotsService(prisma as never);
  });

  it('creates a parking lot', async () => {
    prisma.parkingLot.create.mockResolvedValue(parkingLot);

    const result = await service.create({
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
      },
    });
    expect(result).toBe(parkingLot);
  });

  it('returns only active parking lots by default', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([parkingLot]);

    const result = await service.findAll();

    expect(prisma.parkingLot.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual([parkingLot]);
  });

  it('soft deletes a parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(parkingLot);
    prisma.parkingLot.update.mockResolvedValue({ ...parkingLot, isActive: false });

    const result = await service.remove(parkingLot.id);

    expect(prisma.parkingLot.update).toHaveBeenCalledWith({
      where: { id: parkingLot.id },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('updates an active parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(parkingLot);
    prisma.parkingLot.update.mockResolvedValue({ ...parkingLot, name: 'Updated Lot' });

    const result = await service.update(parkingLot.id, { name: 'Updated Lot' });

    expect(prisma.parkingLot.update).toHaveBeenCalledWith({
      where: { id: parkingLot.id },
      data: { name: 'Updated Lot' },
    });
    expect(result.name).toBe('Updated Lot');
  });

  it('throws when parking lot is not active or missing', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findOne(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
