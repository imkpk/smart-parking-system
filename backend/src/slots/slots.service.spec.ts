import { NotFoundException } from '@nestjs/common';
import { SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { SlotsService } from './slots.service';

describe('SlotsService', () => {
  let service: SlotsService;
  let prisma: {
    $transaction: jest.Mock;
    parkingLot: { findFirst: jest.Mock };
    floor: { findFirst: jest.Mock };
    slot: {
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      parkingLot: { findFirst: jest.fn() },
      floor: { findFirst: jest.fn() },
      slot: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    service = new SlotsService(prisma as never);
  });

  it('filters available slots by parking lot and vehicle type', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, isActive: true });
    prisma.slot.findMany.mockResolvedValue([{ id: 10, slotType: SlotType.CAR }]);

    const result = await service.findAvailableByParkingLot(1, VehicleType.CAR);

    expect(prisma.slot.findMany).toHaveBeenCalledWith({
      where: {
        status: SlotStatus.AVAILABLE,
        slotType: SlotType.CAR,
        floor: {
          parkingLotId: 1,
          parkingLot: { isActive: true },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('lists all slots for a parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, isActive: true });
    prisma.slot.findMany.mockResolvedValue([{ id: 10, slotNumber: 'A-01' }]);

    const result = await service.findByParkingLot(1);

    expect(prisma.slot.findMany).toHaveBeenCalledWith({
      where: {
        floor: {
          parkingLotId: 1,
          parkingLot: { isActive: true },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('lists available slots without a vehicle type filter', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: 1, isActive: true });
    prisma.slot.findMany.mockResolvedValue([{ id: 10, status: SlotStatus.AVAILABLE }]);

    await service.findAvailableByParkingLot(1);

    expect(prisma.slot.findMany).toHaveBeenCalledWith({
      where: {
        status: SlotStatus.AVAILABLE,
        floor: {
          parkingLotId: 1,
          parkingLot: { isActive: true },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
  });

  it('throws when parking lot is missing for slot listing', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findByParkingLot(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a slot inside a transaction', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.create.mockResolvedValue({ id: 10, floorId: 1, slotNumber: 'A-01' });

    const result = await service.create(1, {
      slotNumber: 'A-01',
      slotType: SlotType.CAR,
      status: SlotStatus.AVAILABLE,
    });

    expect(prisma.slot.create).toHaveBeenCalledWith({
      data: {
        slotNumber: 'A-01',
        slotType: SlotType.CAR,
        status: SlotStatus.AVAILABLE,
        floorId: 1,
      },
    });
    expect(result.id).toBe(10);
  });

  it('throws when creating a slot on a missing floor', async () => {
    prisma.floor.findFirst.mockResolvedValue(null);

    await expect(
      service.create(99, {
        slotNumber: 'A-01',
        slotType: SlotType.CAR,
        status: SlotStatus.AVAILABLE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bulk creates slots inside a transaction', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.createMany.mockResolvedValue({ count: 2 });
    prisma.slot.findMany.mockResolvedValue([{ slotNumber: 'A-01' }, { slotNumber: 'A-02' }]);

    const result = await service.createBulk(1, {
      slots: [
        { slotNumber: 'A-01', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE },
        { slotNumber: 'A-02', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.slot.createMany).toHaveBeenCalledWith({
      data: [
        { slotNumber: 'A-01', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE, floorId: 1 },
        { slotNumber: 'A-02', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE, floorId: 1 },
      ],
    });
    expect(result).toHaveLength(2);
  });

  it('throws when bulk creating slots on a missing floor', async () => {
    prisma.floor.findFirst.mockResolvedValue(null);

    await expect(
      service.createBulk(404, {
        slots: [{ slotNumber: 'A-01', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates slot status after checking the slot exists', async () => {
    prisma.slot.findUnique.mockResolvedValue({ id: 1 });
    prisma.slot.update.mockResolvedValue({ id: 1, status: SlotStatus.MAINTENANCE });

    const result = await service.updateStatus(1, { status: SlotStatus.MAINTENANCE });

    expect(result.status).toBe(SlotStatus.MAINTENANCE);
  });

  it('throws when updating a missing slot', async () => {
    prisma.slot.findUnique.mockResolvedValue(null);

    await expect(service.updateStatus(404, { status: SlotStatus.MAINTENANCE })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes a slot after checking the slot exists', async () => {
    prisma.slot.findUnique.mockResolvedValue({ id: 1 });
    prisma.slot.delete.mockResolvedValue({ id: 1 });

    const result = await service.remove(1);

    expect(prisma.slot.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.id).toBe(1);
  });

  it('throws when deleting a missing slot', async () => {
    prisma.slot.findUnique.mockResolvedValue(null);

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes multiple slots by id list', async () => {
    prisma.slot.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.removeBulk([1, 2]);

    expect(prisma.slot.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2] } } });
    expect(result).toEqual({ count: 2 });
  });

  it('throws when bulk deleting with no matching slots', async () => {
    prisma.slot.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.removeBulk([404])).rejects.toBeInstanceOf(NotFoundException);
  });
});
