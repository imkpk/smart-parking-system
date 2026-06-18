import { describe, expect, it } from 'vitest';
import {
  buildSecurityMetrics,
  buildTenantAdminMetrics,
  buildUserOverviewMetrics,
} from '@/lib/operatorDashboardMetrics';
import { getRoleHomePath } from '@/lib/routes';
import {
  createTenantOperatorMetrics,
  createUserOperatorMetrics,
} from '@/test/fixtures/operatorDashboard';

describe('Phase 3 operator dashboard acceptance', () => {
  it('routes each role to the correct dashboard home', () => {
    expect(getRoleHomePath('SUPER_ADMIN')).toBe('/admin/dashboard');
    expect(getRoleHomePath('TENANT_ADMIN')).toBe('/admin/dashboard');
    expect(getRoleHomePath('ADMIN')).toBe('/admin/dashboard');
    expect(getRoleHomePath('SECURITY')).toBe('/security/dashboard');
    expect(getRoleHomePath('USER')).toBe('/user/dashboard');
  });

  it('renders tenant revenue metrics for operator roles only', () => {
    const tenantMetrics = createTenantOperatorMetrics();
    const tenantLabels = buildTenantAdminMetrics(tenantMetrics).map((item) => item.label);
    const securityLabels = buildSecurityMetrics(tenantMetrics).map((item) => item.label);

    expect(tenantLabels).toContain('Revenue Today');
    expect(securityLabels).not.toContain('Revenue Today');
    expect(securityLabels).toContain("Today's Check-ins");
  });

  it('renders user personal overview without occupancy or revenue sections', () => {
    const userMetrics = createUserOperatorMetrics();
    const labels = buildUserOverviewMetrics(userMetrics).map((item) => item.label);

    expect(userMetrics.scope).toBe('USER');
    expect(userMetrics.occupancy).toBeNull();
    expect(userMetrics.revenue).toBeNull();
    expect(labels).toContain('My Vehicles');
    expect(labels).toContain('Upcoming Bookings');
  });

  it('keeps tenant operator metrics independent per organization name', () => {
    const org1 = createTenantOperatorMetrics({ organizationName: 'Tenant A Parking' });
    const org2 = createTenantOperatorMetrics({ organizationName: 'Tenant B Parking' });

    expect(org1.organizationName).not.toBe(org2.organizationName);
    expect(org1.scope).toBe('TENANT');
    expect(org2.scope).toBe('TENANT');
  });
});