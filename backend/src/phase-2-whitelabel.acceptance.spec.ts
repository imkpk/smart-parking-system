/// <reference types="jest" />

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessPolicyService } from './common/access-policy.service';
import {
  DEFAULT_ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
} from './organizations/organizations.constants';
import { OrganizationsService } from './organizations/organizations.service';
import { organizationBrandingSelect } from './organizations/types/organization-branding.type';
import {
  adminUser,
  normalUser,
  securityUser,
  tenantAdminUser,
  tenantAdminUserOrg2,
} from './test/test-users';

describe('Phase 2 white-label branding acceptance', () => {
  const accessPolicy = new AccessPolicyService();
  const org1Branding = {
    name: 'Default Organization',
    slug: 'default',
    logoUrl: 'https://cdn.example.com/org1.svg',
    primaryColor: '#111111',
    secondaryColor: '#222222',
    accentColor: '#333333',
    loginTitle: 'Org One Login',
    supportEmail: 'org1@example.com',
  };
  const org2Branding = {
    name: 'Other Organization',
    slug: 'other-org',
    logoUrl: 'https://cdn.example.com/org2.svg',
    primaryColor: '#AAAAAA',
    secondaryColor: '#BBBBBB',
    accentColor: '#CCCCCC',
    loginTitle: 'Org Two Login',
    supportEmail: 'org2@example.com',
  };

  let prisma: {
    organization: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: OrganizationsService;

  beforeEach(() => {
    prisma = {
      organization: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new OrganizationsService(prisma as never, accessPolicy);
  });

  it('returns distinct public branding per tenant slug', async () => {
    prisma.organization.findFirst.mockResolvedValueOnce(org1Branding);
    const org1 = await service.getPublicBrandingBySlug('default');

    prisma.organization.findFirst.mockResolvedValueOnce(org2Branding);
    const org2 = await service.getPublicBrandingBySlug('other-org');

    expect(org1.primaryColor).toBe('#111111');
    expect(org2.primaryColor).toBe('#AAAAAA');
    expect(org1.name).not.toBe(org2.name);
    expect(org1).not.toHaveProperty('plan');
    expect(org1).not.toHaveProperty('passwordHash');
  });

  it('returns controlled 404 for unknown tenant slug', async () => {
    prisma.organization.findFirst.mockResolvedValue(null);

    await expect(service.getPublicBrandingBySlug('missing-tenant')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes authenticated branding reads to caller organization', async () => {
    prisma.organization.findFirst.mockResolvedValue(org1Branding);

    const branding = await service.getCurrentBranding(tenantAdminUser);

    expect(prisma.organization.findFirst).toHaveBeenCalledWith({
      where: { id: DEFAULT_ORGANIZATION_ID, isActive: true },
      select: organizationBrandingSelect,
    });
    expect(branding.slug).toBe('default');
  });

  it('allows tenant admin to update only own organization branding', async () => {
    prisma.organization.update.mockResolvedValue(org2Branding);

    await service.updateCurrentBranding(tenantAdminUserOrg2, {
      primaryColor: '#AAAAAA',
    });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: OTHER_ORGANIZATION_ID },
      data: { primaryColor: '#AAAAAA' },
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

  it('allows tenant admin to update branding for default demo org', async () => {
    prisma.organization.update.mockResolvedValue(org1Branding);

    const result = await service.updateCurrentBranding(tenantAdminUser, {
      loginTitle: 'Welcome',
    });

    expect(result.loginTitle).toBe('Org One Login');
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: DEFAULT_ORGANIZATION_ID },
      data: { loginTitle: 'Welcome' },
      select: organizationBrandingSelect,
    });
  });
});