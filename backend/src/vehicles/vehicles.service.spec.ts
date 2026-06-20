import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VehicleType } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { adminUser, normalUser } from '../test/test-users';
import { org1, org2 } from '../test/test-tenant-fixtures';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: {
    booking: { count: jest.Mock };
    vehicle: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const vehicle = {
    id: 1,
    userId: normalUser.id,
    organizationId: normalUser.organizationId,
    vehicleNumber: 'TS09EA1234',
    vehicleType: VehicleType.CAR,
  };

  beforeEach(() => {
    prisma = {
      booking: { count: jest.fn() },
      vehicle: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new VehiclesService(prisma as never, new AccessPolicyService());
  });

  it('maps duplicate vehicle number prisma errors to conflict', async () => {
    prisma.vehicle.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['vehicleNumber'] },
      }),
    );

    await expect(
      service.create(normalUser, {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
      }),
    ).rejects.toThrow('Vehicle number already exists');
  });

  it('maps duplicate vehicle number prisma errors during update', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.vehicle.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['vehicleNumber'] },
      }),
    );

    await expect(
      service.update(vehicle.id, normalUser, { vehicleNumber: 'TS09EA9999' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects vehicle creation when organization context is missing', async () => {
    await expect(
      service.create({ ...normalUser, organizationId: null }, {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a vehicle for the current user', async () => {
    prisma.vehicle.create.mockResolvedValue(vehicle);

    const result = await service.create(normalUser, {
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      brand: 'Hyundai',
    });

    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        brand: 'Hyundai',
        userId: normalUser.id,
        organizationId: normalUser.organizationId,
      },
    });
    expect(result).toBe(vehicle);
  });

  it('stores vehicle numbers in uppercase', async () => {
    prisma.vehicle.create.mockResolvedValue({ ...vehicle, vehicleNumber: 'KA05GH1212' });

    await service.create(normalUser, {
      vehicleNumber: 'ka05gh1212',
      vehicleType: vehicle.vehicleType,
    });

    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vehicleNumber: 'KA05GH1212',
      }),
    });
  });

  it('cannot access a vehicle from another organization', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await expect(service.findOneForAdmin(org2.vehicle.id, normalUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
      where: {
        id: org2.vehicle.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
  });

  it('allows owner to update their vehicle', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.vehicle.update.mockResolvedValue({ ...vehicle, color: 'White' });

    const result = await service.update(vehicle.id, normalUser, { color: 'White' });

    expect(result.color).toBe('White');
  });

  it('lists all vehicles scoped to organization', async () => {
    prisma.vehicle.findMany.mockResolvedValue([org1.vehicle]);

    const result = await service.findAll(adminUser);

    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual([org1.vehicle]);
  });

  it('finds one vehicle for admin within organization', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);

    await expect(service.findOneForAdmin(vehicle.id, adminUser)).resolves.toBe(vehicle);
  });

  it('allows admin to update any vehicle in their organization', async () => {
    prisma.vehicle.findFirst.mockResolvedValue({ ...vehicle, userId: 999 });
    prisma.vehicle.update.mockResolvedValue({ ...vehicle, color: 'Black' });

    await expect(service.update(vehicle.id, adminUser, { color: 'Black' })).resolves.toEqual(
      expect.objectContaining({ color: 'Black' }),
    );
  });

  it('blocks users from updating another user vehicle', async () => {
    prisma.vehicle.findFirst.mockResolvedValue({ ...vehicle, userId: 999 });

    await expect(service.update(vehicle.id, normalUser, { color: 'Black' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks deleting vehicles that already have bookings', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.booking.count.mockResolvedValue(1);

    await expect(service.remove(vehicle.id, normalUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes a vehicle without bookings', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.booking.count.mockResolvedValue(0);
    prisma.vehicle.delete.mockResolvedValue(vehicle);

    const result = await service.remove(vehicle.id, normalUser);

    expect(prisma.vehicle.delete).toHaveBeenCalledWith({ where: { id: vehicle.id } });
    expect(result).toBe(vehicle);
  });

  it('throws when removing a missing vehicle', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await expect(service.remove(404, normalUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when vehicle is missing', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await expect(service.findOneForAdmin(404, adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists vehicles for the current user scoped to organization', async () => {
    prisma.vehicle.findMany.mockResolvedValue([vehicle]);

    const result = await service.findMine(normalUser);

    expect(result).toEqual([vehicle]);
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      where: { userId: normalUser.id, organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { id: 'asc' },
    });
  });
});