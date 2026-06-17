import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, VehicleType } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { VehiclesService } from './vehicles.service';
import { adminUser, normalUser } from '../test/test-users';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: {
    booking: { count: jest.Mock };
    user: { findUnique: jest.Mock };
    vehicle: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const vehicle = {
    id: 1,
    userId: normalUser.id,
    vehicleNumber: 'TS09EA1234',
    vehicleType: VehicleType.CAR,
  };

  beforeEach(() => {
    prisma = {
      booking: { count: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          organizationId: normalUser.organizationId,
        }),
      },
      vehicle: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
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
      service.create(normalUser.id, {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
      }),
    ).rejects.toThrow('Vehicle number already exists');
  });

  it('maps duplicate vehicle number prisma errors during update', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(vehicle);
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

  it('rejects vehicle creation when user organization is missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ organizationId: null });

    await expect(
      service.create(normalUser.id, {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a vehicle for the current user', async () => {
    prisma.vehicle.create.mockResolvedValue(vehicle);

    const result = await service.create(normalUser.id, {
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

  it('allows owner to update their vehicle', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(vehicle);
    prisma.vehicle.update.mockResolvedValue({ ...vehicle, color: 'White' });

    const result = await service.update(vehicle.id, normalUser, { color: 'White' });

    expect(result.color).toBe('White');
  });

  it('lists all vehicles', async () => {
    prisma.vehicle.findMany.mockResolvedValue([vehicle]);

    const result = await service.findAll();

    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual([vehicle]);
  });

  it('finds one vehicle for admin', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(vehicle);

    await expect(service.findOneForAdmin(vehicle.id)).resolves.toBe(vehicle);
  });

  it('allows admin to update any vehicle', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, userId: 999 });
    prisma.vehicle.update.mockResolvedValue({ ...vehicle, color: 'Black' });

    await expect(service.update(vehicle.id, adminUser, { color: 'Black' })).resolves.toEqual(
      expect.objectContaining({ color: 'Black' }),
    );
  });

  it('blocks users from updating another user vehicle', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, userId: 999 });

    await expect(service.update(vehicle.id, normalUser, { color: 'Black' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks deleting vehicles that already have bookings', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(vehicle);
    prisma.booking.count.mockResolvedValue(1);

    await expect(service.remove(vehicle.id, normalUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes a vehicle without bookings', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(vehicle);
    prisma.booking.count.mockResolvedValue(0);
    prisma.vehicle.delete.mockResolvedValue(vehicle);

    const result = await service.remove(vehicle.id, normalUser);

    expect(prisma.vehicle.delete).toHaveBeenCalledWith({ where: { id: vehicle.id } });
    expect(result).toBe(vehicle);
  });

  it('throws when removing a missing vehicle', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(null);

    await expect(service.remove(404, normalUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when vehicle is missing', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(null);

    await expect(service.findOneForAdmin(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists vehicles for the current user', async () => {
    prisma.vehicle.findMany.mockResolvedValue([vehicle]);

    const result = await service.findMine(normalUser.id);

    expect(result).toEqual([vehicle]);
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      where: { userId: normalUser.id },
      orderBy: { id: 'asc' },
    });
  });
});
