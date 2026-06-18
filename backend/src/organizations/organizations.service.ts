import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AccessPolicyService } from '../common/access-policy.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { UpdateOrganizationBrandingDto } from './dto/update-organization-branding.dto';
import { OnboardOrganizationDto } from './dto/onboard-organization.dto';
import {
  OrganizationBranding,
  organizationBrandingSelect,
} from './types/organization-branding.type';

const ONBOARDING_UNIQUE_MESSAGES = {
  slug: 'Organization slug already exists',
  'organizationId,email': 'Tenant admin email already exists',
  'organizationId,phone': 'Tenant admin phone number already exists',
  email: 'Tenant admin email already exists',
  phone: 'Tenant admin phone number already exists',
};

const tenantAdminSelect = {
  id: true,
  organizationId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async onboard(currentUser: SafeUser, dto: OnboardOrganizationDto) {
    if (currentUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can onboard tenants');
    }

    const slug = this.resolveSlug(dto.organization.slug ?? dto.organization.name);
    const passwordHash = await bcrypt.hash(dto.tenantAdmin.password, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.organization.name.trim(),
            slug,
          },
        });

        const tenantAdmin = await tx.user.create({
          data: {
            organizationId: organization.id,
            name: dto.tenantAdmin.name.trim(),
            email: dto.tenantAdmin.email,
            phone: dto.tenantAdmin.phone,
            passwordHash,
            role: Role.TENANT_ADMIN,
          },
          select: tenantAdminSelect,
        });

        return {
          organization,
          tenantAdmin,
        };
      });
    } catch (error) {
      handlePrismaUniqueConstraint(
        error,
        ONBOARDING_UNIQUE_MESSAGES,
        'Tenant onboarding record already exists',
      );
    }
  }

  async getPublicBrandingBySlug(slug: string): Promise<OrganizationBranding> {
    const organization = await this.prisma.organization.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        isActive: true,
      },
      select: organizationBrandingSelect,
    });

    if (!organization) {
      throw new NotFoundException('Organization branding not found');
    }

    return organization;
  }

  async getCurrentBranding(currentUser: SafeUser): Promise<OrganizationBranding> {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        isActive: true,
      },
      select: organizationBrandingSelect,
    });

    if (!organization) {
      throw new NotFoundException('Organization branding not found');
    }

    return organization;
  }

  async updateCurrentBranding(
    currentUser: SafeUser,
    dto: UpdateOrganizationBrandingDto,
  ): Promise<OrganizationBranding> {
    if (currentUser.role !== Role.SUPER_ADMIN && currentUser.role !== Role.TENANT_ADMIN) {
      throw new ForbiddenException('Only tenant admins can update organization branding');
    }

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const data = this.buildBrandingUpdateData(dto);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one branding field is required');
    }

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data,
      select: organizationBrandingSelect,
    });

    return organization;
  }

  private buildBrandingUpdateData(dto: UpdateOrganizationBrandingDto): Prisma.OrganizationUpdateInput {
    const data: Prisma.OrganizationUpdateInput = {};

    if (dto.logoUrl !== undefined) {
      data.logoUrl = dto.logoUrl;
    }
    if (dto.primaryColor !== undefined) {
      data.primaryColor = dto.primaryColor;
    }
    if (dto.secondaryColor !== undefined) {
      data.secondaryColor = dto.secondaryColor;
    }
    if (dto.accentColor !== undefined) {
      data.accentColor = dto.accentColor;
    }
    if (dto.loginTitle !== undefined) {
      data.loginTitle = dto.loginTitle?.trim() ?? null;
    }
    if (dto.supportEmail !== undefined) {
      data.supportEmail = dto.supportEmail;
    }

    return data;
  }

  private resolveSlug(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      throw new BadRequestException('Organization slug is required');
    }

    return slug;
  }
}