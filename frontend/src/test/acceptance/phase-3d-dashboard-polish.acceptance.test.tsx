import { describe, expect, it } from 'vitest';
import {
  buildPlatformHeroKpis,
  buildTenantAdminMetrics,
  buildTenantHeroKpis,
  buildUserHeroKpis,
} from '@/lib/operatorDashboardMetrics';
import {
  createTenantOperatorMetrics,
  createUserOperatorMetrics,
  securityOperatorMetrics,
} from '@/test/fixtures/operatorDashboard';

describe('Phase 3D dashboard polish acceptance', () => {
  it('builds exactly four tenant hero KPIs including revenue for operator roles', () => {
    const metrics = createTenantOperatorMetrics();
    const heroLabels = buildTenantHeroKpis(metrics).map((item) => item.label);

    expect(heroLabels).toEqual([
      'Utilization',
      'Active Sessions',
      "Today's Check-ins",
      'Revenue Today',
    ]);
    expect(buildTenantAdminMetrics(metrics).map((item) => item.label)).toContain('Total Bookings');
  });

  it('keeps security hero KPIs revenue-free while preserving operational signals', () => {
    const heroLabels = buildTenantHeroKpis(securityOperatorMetrics).map((item) => item.label);

    expect(heroLabels).not.toContain('Revenue Today');
    expect(heroLabels).toContain("Today's Check-outs");
    expect(heroLabels).toHaveLength(4);
  });

  it('builds four user hero KPIs without occupancy or revenue sections', () => {
    const userMetrics = createUserOperatorMetrics();
    const heroLabels = buildUserHeroKpis(userMetrics).map((item) => item.label);

    expect(heroLabels).toHaveLength(4);
    expect(userMetrics.occupancy).toBeNull();
    expect(userMetrics.revenue).toBeNull();
    expect(heroLabels).toContain('My Vehicles');
  });

  it('builds four platform hero KPIs for super admin overview', () => {
    const metrics = createTenantOperatorMetrics({
      scope: 'PLATFORM',
      role: 'SUPER_ADMIN',
      organizationName: null,
      platformOverview: {
        totalOrganizations: 3,
        totalUsers: 40,
        totalParkingLots: 8,
        totalSlots: 200,
      },
    });

    expect(buildPlatformHeroKpis(metrics).map((item) => item.label)).toEqual([
      'Organizations',
      'Total Users',
      'Parking Lots',
      'Total Slots',
    ]);
  });
});