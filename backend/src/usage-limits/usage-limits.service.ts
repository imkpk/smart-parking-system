import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrganizationPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type UsageLimitResource = 'parkingLots' | 'users' | 'bookingsThisMonth';

type PlanLimits = {
  parkingLots: number | null;
  users: number | null;
  bookingsThisMonth: number | null;
};

const PLAN_LIMITS: Record<OrganizationPlan, PlanLimits> = {
  FREE: { parkingLots: 2, users: 10, bookingsThisMonth: 500 },
  STARTER: { parkingLots: 10, users: 50, bookingsThisMonth: 5000 },
  PRO: { parkingLots: null, users: null, bookingsThisMonth: null },
  ENTERPRISE: { parkingLots: null, users: null, bookingsThisMonth: null },
};

@Injectable()
export class UsageLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkLimit(organizationId: number, resource: UsageLimitResource): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    if (!organization) {
      throw new ForbiddenException('Organization not found');
    }

    const limit = PLAN_LIMITS[organization.plan][resource];

    if (limit == null) {
      return;
    }

    const currentUsage = await this.getCurrentUsage(organizationId, resource);

    if (currentUsage >= limit) {
      throw new ForbiddenException(
        `${organization.plan} plan limit reached for ${resource}. Upgrade to continue.`,
      );
    }
  }

  private async getCurrentUsage(
    organizationId: number,
    resource: UsageLimitResource,
  ): Promise<number> {
    switch (resource) {
      case 'parkingLots':
        return this.prisma.parkingLot.count({
          where: { organizationId, isActive: true },
        });
      case 'users':
        return this.prisma.user.count({
          where: { organizationId, isActive: true },
        });
      case 'bookingsThisMonth': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        return this.prisma.booking.count({
          where: {
            organizationId,
            createdAt: { gte: startOfMonth },
          },
        });
      }
      default:
        return 0;
    }
  }
}