/// <reference types="jest" />

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AccessPolicyService } from '../common/access-policy.service';
import {
  adminUser,
  normalUser,
  securityUser,
  superAdminUser,
  tenantAdminUser,
  tenantAdminUserOrg2,
} from '../test/test-users';
import { DEFAULT_ORGANIZATION_ID, OTHER_ORGANIZATION_ID } from './organizations.constants';
import { OrganizationsService } from './organizations.service';
import { organizationBrandingSelect } from './types/organization-branding.type';

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
    organization: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
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
    secondaryColor: null,
    accentColor: null,
    loginTitle: null,
    supportEmail: null,
    plan: 'STARTER',
    maxParkingLots: 5,
    maxUsers: 50,
    isActive: true,
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:00:00.000Z'),
  };

  const branding = {
    name: 'Default Organization',
    slug: 'default',
    logoUrl: 'https://cdn.example.com/logo.svg',
    primaryColor: '#1565C0',
    secondaryColor: '#F9A825',
    accentColor: '#0288D1',
    loginTitle: 'Welcome',
    supportEmail: 'support@example.com',
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
      organization: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new OrganizationsService(prisma as never, new AccessPolicyService());
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

  describe('branding', () => {
    it('returns public branding by slug with safe fields only', async () => {
      prisma.organization.findFirst.mockResolvedValue(branding);

      const result = await service.getPublicBrandingBySlug('default');

      expect(prisma.organization.findFirst).toHaveBeenCalledWith({
        where: { slug: 'default', isActive: true },
        select: organizationBrandingSelect,
      });
      expect(result).toEqual(branding);
      expect(result).not.toHaveProperty('plan');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns 404 for unknown public branding slug', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(service.getPublicBrandingBySlug('missing-tenant')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns current organization branding for authenticated tenant user', async () => {
      prisma.organization.findFirst.mockResolvedValue(branding);

      const result = await service.getCurrentBranding(tenantAdminUser);

      expect(prisma.organization.findFirst).toHaveBeenCalledWith({
        where: { id: DEFAULT_ORGANIZATION_ID, isActive: true },
        select: organizationBrandingSelect,
      });
      expect(result).toEqual(branding);
    });

    it('rejects current branding lookup without organization context', async () => {
      await expect(service.getCurrentBranding(superAdminUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.organization.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 when current organization branding is missing', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(service.getCurrentBranding(tenantAdminUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('allows TENANT_ADMIN to update own organization branding', async () => {
      const updated = { ...branding, primaryColor: '#112233' };
      prisma.organization.update.mockResolvedValue(updated);

      const result = await service.updateCurrentBranding(tenantAdminUser, {
        logoUrl: 'https://cdn.example.com/new-logo.svg',
        primaryColor: '#112233',
        secondaryColor: '#445566',
        supportEmail: 'help@example.com',
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: DEFAULT_ORGANIZATION_ID },
        data: {
          logoUrl: 'https://cdn.example.com/new-logo.svg',
          primaryColor: '#112233',
          secondaryColor: '#445566',
          supportEmail: 'help@example.com',
        },
        select: organizationBrandingSelect,
      });
      expect(result).toEqual(updated);
    });

    it('allows SUPER_ADMIN with organization context to update branding', async () => {
      const superAdminWithOrg = { ...superAdminUser, organizationId: DEFAULT_ORGANIZATION_ID };
      prisma.organization.update.mockResolvedValue(branding);

      await service.updateCurrentBranding(superAdminWithOrg, { loginTitle: 'Hello' });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: DEFAULT_ORGANIZATION_ID },
        data: { loginTitle: 'Hello' },
        select: organizationBrandingSelect,
      });
    });

    it.each([
      ['ADMIN', adminUser],
      ['SECURITY', securityUser],
      ['USER', normalUser],
    ])('forbids %s from updating branding', async (_role, user) => {
      await expect(
        service.updateCurrentBranding(user, { primaryColor: '#112233' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('scopes branding updates to the caller organization only', async () => {
      prisma.organization.update.mockResolvedValue(branding);

      await service.updateCurrentBranding(tenantAdminUserOrg2, { accentColor: '#AABBCC' });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: OTHER_ORGANIZATION_ID },
        data: { accentColor: '#AABBCC' },
        select: organizationBrandingSelect,
      });
    });

    it('rejects empty branding update payloads', async () => {
      await expect(service.updateCurrentBranding(tenantAdminUser, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('trims login title and clears nullable branding fields', async () => {
      prisma.organization.update.mockResolvedValue(branding);

      await service.updateCurrentBranding(tenantAdminUser, {
        loginTitle: '  Welcome Back  ',
        accentColor: null,
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: DEFAULT_ORGANIZATION_ID },
        data: { loginTitle: 'Welcome Back', accentColor: null },
        select: organizationBrandingSelect,
      });
    });

    it('clears login title when null is provided', async () => {
      prisma.organization.update.mockResolvedValue(branding);

      await service.updateCurrentBranding(tenantAdminUser, {
        loginTitle: null,
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: DEFAULT_ORGANIZATION_ID },
        data: { loginTitle: null },
        select: organizationBrandingSelect,
      });
    });
  });
});