import { ForbiddenException } from '@nestjs/common';
import { OrganizationPlan } from '@prisma/client';
import { UsageLimitsService } from './usage-limits.service';

describe('UsageLimitsService', () => {
  let service: UsageLimitsService;
  let prisma: {
    organization: { findUnique: jest.Mock };
    parkingLot: { count: jest.Mock };
    user: { count: jest.Mock };
    booking: { count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      organization: { findUnique: jest.fn() },
      parkingLot: { count: jest.fn() },
      user: { count: jest.fn() },
      booking: { count: jest.fn() },
    };
    service = new UsageLimitsService(prisma as never);
  });

  it('allows creation below FREE parking lot limit', async () => {
    prisma.organization.findUnique.mockResolvedValue({ plan: OrganizationPlan.FREE });
    prisma.parkingLot.count.mockResolvedValue(1);

    await expect(service.checkLimit(1, 'parkingLots')).resolves.toBeUndefined();
  });

  it('blocks creation when FREE parking lot limit is reached', async () => {
    prisma.organization.findUnique.mockResolvedValue({ plan: OrganizationPlan.FREE });
    prisma.parkingLot.count.mockResolvedValue(2);

    await expect(service.checkLimit(1, 'parkingLots')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows unlimited resources for PRO plan', async () => {
    prisma.organization.findUnique.mockResolvedValue({ plan: OrganizationPlan.PRO });

    await expect(service.checkLimit(1, 'users')).resolves.toBeUndefined();
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('counts monthly bookings for STARTER plan', async () => {
    prisma.organization.findUnique.mockResolvedValue({ plan: OrganizationPlan.STARTER });
    prisma.booking.count.mockResolvedValue(4999);

    await expect(service.checkLimit(1, 'bookingsThisMonth')).resolves.toBeUndefined();
    expect(prisma.booking.count).toHaveBeenCalled();
  });
});