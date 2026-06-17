import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { adminUser } from '../test/test-users';
import { org1, org2 } from '../test/test-tenant-fixtures';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { SlotsService } from './slots.service';

describe('SlotsService', () => {
  let service: SlotsService;
  let prisma: {
    $transaction: jest.Mock;
    parkingLot: { findFirst: jest.Mock };
    floor: { findFirst: jest.Mock };
    slot: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      parkingLot: { findFirst: jest.fn() },
      floor: { findFirst: jest.fn() },
      slot: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const parkingLotValidationService = new ParkingLotValidationService(prisma as never);
    service = new SlotsService(
      prisma as never,
      parkingLotValidationService,
      new AccessPolicyService(),
    );
  });

  it('filters available slots by parking lot and vehicle type', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(org1.parkingLot);
    prisma.slot.findMany.mockResolvedValue([{ id: 10, slotType: SlotType.CAR }]);

    const result = await service.findAvailableByParkingLot(1, adminUser, VehicleType.CAR);

    expect(prisma.slot.findMany).toHaveBeenCalledWith({
      where: {
        status: SlotStatus.AVAILABLE,
        slotType: SlotType.CAR,
        floor: {
          parkingLotId: 1,
          parkingLot: { isActive: true, organizationId: DEFAULT_ORGANIZATION_ID },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('lists all slots for a parking lot scoped to organization', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(org1.parkingLot);
    prisma.slot.findMany.mockResolvedValue([{ id: 10, slotNumber: 'A-01' }]);

    const result = await service.findByParkingLot(1, adminUser);

    expect(prisma.slot.findMany).toHaveBeenCalledWith({
      where: {
        floor: {
          parkingLotId: 1,
          parkingLot: { isActive: true, organizationId: DEFAULT_ORGANIZATION_ID },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('cannot list slots for a parking lot in another organization', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findByParkingLot(org2.parkingLot.id, adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists available slots without a vehicle type filter', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(org1.parkingLot);
    prisma.slot.findMany.mockResolvedValue([{ id: 10, status: SlotStatus.AVAILABLE }]);

    await service.findAvailableByParkingLot(1, adminUser);

    expect(prisma.slot.findMany).toHaveBeenCalledWith({
      where: {
        status: SlotStatus.AVAILABLE,
        floor: {
          parkingLotId: 1,
          parkingLot: { isActive: true, organizationId: DEFAULT_ORGANIZATION_ID },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
  });

  it('throws when parking lot is missing for slot listing', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.findByParkingLot(404, adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a slot inside a transaction', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.create.mockResolvedValue({ id: 10, floorId: 1, slotNumber: 'A-01' });

    const result = await service.create(1, adminUser, {
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

  it('maps duplicate slot prisma errors to conflict', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['floorId', 'slotNumber'] },
      }),
    );

    await expect(
      service.create(1, adminUser, {
        slotNumber: 'A-01',
        slotType: SlotType.CAR,
        status: SlotStatus.AVAILABLE,
      }),
    ).rejects.toThrow('Slot already exists');
  });

  it('maps duplicate slot prisma errors during bulk create', async () => {
    prisma.floor.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.createMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['floorId', 'slotNumber'] },
      }),
    );

    await expect(
      service.createBulk(1, adminUser, {
        slots: [
          { slotNumber: 'A-01', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when creating a slot on a missing floor', async () => {
    prisma.floor.findFirst.mockResolvedValue(null);

    await expect(
      service.create(99, adminUser, {
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

    const result = await service.createBulk(1, adminUser, {
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
      service.createBulk(404, adminUser, {
        slots: [{ slotNumber: 'A-01', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates slot status after checking the slot exists', async () => {
    prisma.slot.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.update.mockResolvedValue({ id: 1, status: SlotStatus.MAINTENANCE });

    const result = await service.updateStatus(1, adminUser, { status: SlotStatus.MAINTENANCE });

    expect(result.status).toBe(SlotStatus.MAINTENANCE);
  });

  it('throws when updating a missing slot', async () => {
    prisma.slot.findFirst.mockResolvedValue(null);

    await expect(
      service.updateStatus(404, adminUser, { status: SlotStatus.MAINTENANCE }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a slot after checking the slot exists', async () => {
    prisma.slot.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.delete.mockResolvedValue({ id: 1 });

    const result = await service.remove(1, adminUser);

    expect(prisma.slot.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.id).toBe(1);
  });

  it('throws when deleting a missing slot', async () => {
    prisma.slot.findFirst.mockResolvedValue(null);

    await expect(service.remove(404, adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes multiple slots by id list scoped to organization', async () => {
    prisma.slot.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.removeBulk([1, 2], adminUser);

    expect(prisma.slot.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1, 2] },
        floor: {
          parkingLot: { organizationId: DEFAULT_ORGANIZATION_ID },
        },
      },
    });
    expect(result).toEqual({ count: 2 });
  });

  it('throws when bulk deleting with no matching slots', async () => {
    prisma.slot.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.removeBulk([404], adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });
});