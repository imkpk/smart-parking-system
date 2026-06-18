import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { OnboardOrganizationDto } from './dto/onboard-organization.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
