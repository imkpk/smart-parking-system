import { screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOperatorMetrics } from '@/api/dashboardApi';
import { renderWithProviders } from '@/test/test-utils';
import {
  platformOperatorMetrics,
  securityOperatorMetrics,
  tenantOperatorMetrics,
  userOperatorMetrics,
} from '@/test/fixtures/operatorDashboard';
import { AdminDashboardPage } from '@/pages/dashboard/AdminDashboardPage';
import { SecurityDashboardPage } from '@/pages/dashboard/SecurityDashboardPage';
import { UserDashboardPage } from '@/pages/dashboard/UserDashboardPage';

vi.mock('@/api/dashboardApi', () => ({
  getOperatorMetrics: vi.fn(),
}));

vi.mock('@/providers/TenantBrandingProvider', () => ({
  useTenantBranding: () => ({
    branding: { name: 'Smart Parking' },
    isLoading: false,
    error: null,
    tenantSlug: null,
    setTenantSlug: vi.fn(),
    refreshBranding: vi.fn(),
  }),
}));

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(tenantOperatorMetrics);
  });

  it('shows access denied when operator metrics returns forbidden', async () => {
    const error = new AxiosError('Forbidden');
    error.response = { status: 403 } as AxiosError['response'];
    vi.mocked(getOperatorMetrics).mockRejectedValue(error);

    renderWithProviders(<AdminDashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /access denied\. admin role is required/i,
    );
    expect(screen.queryByText('Total Bookings')).not.toBeInTheDocument();
  });

  it('renders tenant admin dashboard metrics and sections', async () => {
    renderWithProviders(<AdminDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/overview for acme parking/i)).toBeInTheDocument();
      expect(screen.getByText('Occupancy Summary')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Revenue Today')).toBeInTheDocument();
    expect(screen.getByText('₹1200.00')).toBeInTheDocument();
    expect(screen.getByText('Lot Utilization')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('TS09EA1234')).toBeInTheDocument();
    expect(screen.getByText('Check-in')).toBeInTheDocument();
  });

  it('renders platform overview for platform scope', async () => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(platformOperatorMetrics);

    renderWithProviders(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Organizations')).toBeInTheDocument();
    });

    expect(screen.getByText(/platform-wide parking operations overview/i)).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Parking Lots')).toBeInTheDocument();
    expect(screen.queryByText('Lot Utilization')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue Today')).not.toBeInTheDocument();
  });
});

describe('SecurityDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(securityOperatorMetrics);
  });

  it('renders security dashboard without revenue or lot utilization', async () => {
    renderWithProviders(<SecurityDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Today's Bookings")).toBeInTheDocument();
    });

    expect(screen.getByText('Occupancy Summary')).toBeInTheDocument();
    expect(screen.getByText("Today's Check-ins")).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.queryByText('Revenue Today')).not.toBeInTheDocument();
    expect(screen.queryByText('Lot Utilization')).not.toBeInTheDocument();
  });
});

describe('UserDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(userOperatorMetrics);
  });

  it('renders user dashboard overview and recent activity', async () => {
    renderWithProviders(<UserDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('My Vehicles')).toBeInTheDocument();
    });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Bookings')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.queryByText('Occupancy Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue Today')).not.toBeInTheDocument();
  });
});