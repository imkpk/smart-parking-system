import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { userRecord } from '../test/test-users';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new UsersService(prisma as never);
  });

  it('creates a user and removes passwordHash from the response', async () => {
    prisma.user.create.mockResolvedValue(userRecord);

    const result = await service.create({
      name: userRecord.name,
      email: userRecord.email,
      passwordHash: userRecord.passwordHash,
    });

    expect(result).toEqual({
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      phone: userRecord.phone,
      role: userRecord.role,
      isActive: userRecord.isActive,
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws when user is not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finds a user by email', async () => {
    prisma.user.findUnique.mockResolvedValue(userRecord);

    const result = await service.findByEmail(userRecord.email);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: userRecord.email },
    });
    expect(result).toBe(userRecord);
  });

  it('lists users as safe users', async () => {
    prisma.user.findMany.mockResolvedValue([userRecord]);

    const result = await service.findAll();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
    });
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('finds one user as a safe user', async () => {
    prisma.user.findUnique.mockResolvedValue(userRecord);

    const result = await service.findOne(userRecord.id);

    expect(result.id).toBe(userRecord.id);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns only active user by id', async () => {
    prisma.user.findFirst.mockResolvedValue(userRecord);

    const result = await service.findActiveById(userRecord.id);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: userRecord.id, isActive: true },
    });
    expect(result?.id).toBe(userRecord.id);
  });

  it('returns null when active user is not found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findActiveById(999)).resolves.toBeNull();
  });
});
