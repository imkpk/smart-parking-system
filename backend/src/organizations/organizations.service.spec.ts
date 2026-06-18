/// <reference types="jest" />

import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { adminUser, normalUser, securityUser, superAdminUser } from '../test/test-users';
import { OrganizationsService } from './organizations.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let tx: {
    organization: { create: jest.Mock };
    user: { create: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
  };

  const onboardDto = {
    organization: {
      name: 'Metro Mall',
      slug: 'metro-mall',
    },
    tenantAdmin: {
      name: 'Mall Admin',
      email: 'mall.admin@example.com',
      password: 'password123',
      phone: '+919999999999',
    },
  };

  const organization = {
    id: 50,
    name: 'Metro Mall',
    slug: 'metro-mall',
    logoUrl: null,
    primaryColor: null,
    plan: 'STARTER',
    maxParkingLots: 5,
    maxUsers: 50,
    isActive: true,
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:00:00.000Z'),
  };

  const tenantAdmin = {
    id: 501,
    organizationId: organization.id,
    name: onboardDto.tenantAdmin.name,
    email: onboardDto.tenantAdmin.email,
    phone: onboardDto.tenantAdmin.phone,
    role: Role.TENANT_ADMIN,
    isActive: true,
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:00:00.000Z'),
  };

  beforeEach(() => {
    tx = {
      organization: { create: jest.fn().mockResolvedValue(organization) },
      user: { create: jest.fn().mockResolvedValue(tenantAdmin) },
    };
    prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    service = new OrganizationsService(prisma as never);
    jest.mocked(bcrypt.hash).mockReset();
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
  });

  it('onboards an organization and first tenant admin in one transaction', async () => {
    const result = await service.onboard(superAdminUser, onboardDto);

    expect(bcrypt.hash).toHaveBeenCalledWith(onboardDto.tenantAdmin.password, 10);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.organization.create).toHaveBeenCalledWith({
      data: {
        name: onboardDto.organization.name,
        slug: onboardDto.organization.slug,
      },
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        organizationId: organization.id,
        name: onboardDto.tenantAdmin.name,
        email: onboardDto.tenantAdmin.email,
        phone: onboardDto.tenantAdmin.phone,
        passwordHash: 'hashed-password',
        role: Role.TENANT_ADMIN,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual({ organization, tenantAdmin });
    expect(result.tenantAdmin).not.toHaveProperty('passwordHash');
    expect(result.tenantAdmin.organizationId).toBe(organization.id);
    expect(result.tenantAdmin.role).toBe(Role.TENANT_ADMIN);
  });

  it('derives a slug from organization name when slug is omitted', async () => {
    await service.onboard(superAdminUser, {
      ...onboardDto,
      organization: { name: 'City Mall Pvt. Ltd.' },
    });

    expect(tx.organization.create).toHaveBeenCalledWith({
      data: {
        name: 'City Mall Pvt. Ltd.',
        slug: 'city-mall-pvt-ltd',
      },
    });
  });

  it.each([
    ['ADMIN', adminUser],
    ['SECURITY', securityUser],
    ['USER', normalUser],
  ])('rejects %s tenant onboarding', async (_role, user) => {
    await expect(service.onboard(user, onboardDto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an empty resolved organization slug', async () => {
    await expect(
      service.onboard(superAdminUser, {
        ...onboardDto,
        organization: { name: '!!!' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate organization slug according to schema uniqueness', async () => {
    tx.organization.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['slug'] },
      }),
    );

    await expect(service.onboard(superAdminUser, onboardDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate tenant admin email within an organization and rolls back the transaction', async () => {
    tx.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['organizationId', 'email'] },
      }),
    );

    await expect(service.onboard(superAdminUser, onboardDto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.organization.create).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate tenant admin phone within an organization', async () => {
    tx.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['organizationId', 'phone'] },
      }),
    );

    await expect(service.onboard(superAdminUser, onboardDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unexpected tenant onboarding errors', async () => {
    const error = new Error('database unavailable');
    tx.user.create.mockRejectedValue(error);

    await expect(service.onboard(superAdminUser, onboardDto)).rejects.toBe(error);
  });
});
