import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { UsersService } from './users.service';
import { adminUser, normalUserOrg2, userRecord } from '../test/test-users';

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
    service = new UsersService(prisma as never, new AccessPolicyService());
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
      organizationId: userRecord.organizationId,
      organization: null,
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
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne(999, adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finds a user by email across organizations', async () => {
    prisma.user.findFirst.mockResolvedValue(userRecord);

    const result = await service.findByEmail(userRecord.email);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: userRecord.email,
        isActive: true,
      },
    });
    expect(result).toBe(userRecord);
  });

  it('finds a user by phone across organizations', async () => {
    prisma.user.findFirst.mockResolvedValue(userRecord);

    const result = await service.findByPhone(userRecord.phone!);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        phone: userRecord.phone,
        isActive: true,
      },
    });
    expect(result).toBe(userRecord);
  });

  it('returns null when no active user matches email', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await service.findByEmail(userRecord.email);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: userRecord.email,
        isActive: true,
      },
    });
    expect(result).toBeNull();
  });

  it('maps duplicate email prisma errors to conflict', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['email'] },
      }),
    );

    await expect(
      service.create({
        name: userRecord.name,
        email: userRecord.email,
        passwordHash: userRecord.passwordHash,
      }),
    ).rejects.toThrow('Email already exists');
  });

  it('maps duplicate phone prisma errors to conflict', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['phone'] },
      }),
    );

    await expect(
      service.create({
        name: userRecord.name,
        email: userRecord.email,
        phone: userRecord.phone,
        passwordHash: userRecord.passwordHash,
      }),
    ).rejects.toThrow('Phone number already exists');
  });

  it('maps unknown user unique prisma errors to conflict', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['unknown'] },
      }),
    );

    await expect(
      service.create({
        name: userRecord.name,
        email: userRecord.email,
        passwordHash: userRecord.passwordHash,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps unique prisma errors with non-array targets to generic conflict', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: 'users_phone_key' },
      }),
    );

    await expect(
      service.create({
        name: userRecord.name,
        email: userRecord.email,
        passwordHash: userRecord.passwordHash,
      }),
    ).rejects.toThrow('User already exists');
  });

  it('rethrows non-unique prisma errors', async () => {
    const error = new Error('Database unavailable');
    prisma.user.create.mockRejectedValue(error);

    await expect(
      service.create({
        name: userRecord.name,
        email: userRecord.email,
        passwordHash: userRecord.passwordHash,
      }),
    ).rejects.toBe(error);
  });

  it('lists users as safe users scoped to organization', async () => {
    prisma.user.findMany.mockResolvedValue([userRecord]);

    const result = await service.findAll(adminUser);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { id: 'asc' },
    });
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('does not list users from another organization', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.findAll(adminUser);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual([]);
  });

  it('finds one user as a safe user scoped to organization', async () => {
    prisma.user.findFirst.mockResolvedValue(userRecord);

    const result = await service.findOne(userRecord.id, adminUser);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: userRecord.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
    expect(result.id).toBe(userRecord.id);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('does not return a user from another organization', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne(normalUserOrg2.id, adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: normalUserOrg2.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
  });

  it('returns active user with organization summary when relation exists', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...userRecord,
      organization: {
        id: userRecord.organizationId,
        name: 'Default Organization',
        slug: 'default',
      },
    });

    const result = await service.findActiveById(userRecord.id);

    expect(result).toEqual({
      id: userRecord.id,
      organizationId: userRecord.organizationId,
      organization: {
        id: userRecord.organizationId,
        name: 'Default Organization',
        slug: 'default',
      },
      name: userRecord.name,
      email: userRecord.email,
      phone: userRecord.phone,
      role: userRecord.role,
      isActive: userRecord.isActive,
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt,
    });
  });

  it('returns only active user by id', async () => {
    prisma.user.findFirst.mockResolvedValue(userRecord);

    const result = await service.findActiveById(userRecord.id);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: userRecord.id, isActive: true },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    expect(result?.id).toBe(userRecord.id);
  });

  it('returns null when active user is not found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findActiveById(999)).resolves.toBeNull();
  });
});
