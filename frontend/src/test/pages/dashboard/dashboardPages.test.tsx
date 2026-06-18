import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOperatorMetrics, getRecentActivity } from '@/api/dashboardApi';
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
  getRecentActivity: vi.fn(),
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

const recentActivityPage = {
  items: tenantOperatorMetrics.recentActivity,
  nextCursor: 'cursor-page-2',
  hasMore: true,
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(tenantOperatorMetrics);
    vi.mocked(getRecentActivity).mockResolvedValue(recentActivityPage);
  });

  it('shows access denied when operator metrics returns forbidden', async () => {
    const error = new AxiosError('Forbidden');
    error.response = { status: 403 } as AxiosError['response'];
    vi.mocked(getOperatorMetrics).mockRejectedValue(error);

    renderWithProviders(<AdminDashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /access denied\. admin role is required/i,
    );
    expect(screen.queryByText('Utilization')).not.toBeInTheDocument();
  });

  it('renders four hero KPIs, slot status chart, compact lot list, and activity timeline', async () => {
    renderWithProviders(<AdminDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/overview for acme parking/i)).toBeInTheDocument();
      expect(screen.getByText('Utilization')).toBeInTheDocument();
    });

    expect(screen.getAllByText('29%').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText('29% utilized')).toBeInTheDocument();
    expect(screen.getByText('Utilized')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText("Today's Check-ins")).toBeInTheDocument();
    expect(screen.getByText('Revenue Today')).toBeInTheDocument();
    expect(screen.getByText('Slot Status')).toBeInTheDocument();
    expect(screen.getByText('Lot Utilization')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1. Lot B')).toBeInTheDocument();
      expect(screen.getByText(/30\/40 · 75%/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    const viewAllActivity = screen.getByRole('link', { name: /view all activity/i });
    expect(viewAllActivity).toHaveAttribute('href', '/parking-events');
    expect(viewAllActivity).toHaveClass('MuiButton-outlined');

    await waitFor(() => {
      expect(screen.getByText('TS09EA1234')).toBeInTheDocument();
      expect(screen.getByText('Check-in')).toBeInTheDocument();
      expect(screen.getByText(/Lot A · Ground · A-01/)).toBeInTheDocument();
    });
  });

  it('searches recent activity by vehicle, lot, floor, or slot', async () => {
    const user = userEvent.setup();
    vi.mocked(getRecentActivity).mockResolvedValue({
      items: [tenantOperatorMetrics.recentActivity[0]],
      nextCursor: null,
      hasMore: false,
    });

    renderWithProviders(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('TS09EA1234')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/search activity/i), 'TS09EA1234');

    await waitFor(() => {
      expect(getRecentActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          q: 'TS09EA1234',
        }),
      );
    });
  });

  it('renders a scrollable recent activity panel instead of load more button', async () => {
    renderWithProviders(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('TS09EA1234')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/search activity/i)).toBeInTheDocument();
    const viewAllActivity = screen.getByRole('link', { name: /view all activity/i });
    expect(viewAllActivity).toBeInTheDocument();
    expect(viewAllActivity).toHaveClass('MuiButton-outlined');
  });

  it('renders platform hero KPIs and slot status without tenant lot list', async () => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(platformOperatorMetrics);
    vi.mocked(getRecentActivity).mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });

    renderWithProviders(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Organizations')).toBeInTheDocument();
    });

    expect(screen.getByText(/platform-wide parking operations overview/i)).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Parking Lots')).toBeInTheDocument();
    expect(screen.getByText('Slot Status')).toBeInTheDocument();
    expect(screen.queryByText('Revenue Today')).not.toBeInTheDocument();
    expect(screen.queryByText('1. Lot B')).not.toBeInTheDocument();
  });
});

describe('SecurityDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(securityOperatorMetrics);
    vi.mocked(getRecentActivity).mockResolvedValue(recentActivityPage);
  });

  it('renders security dashboard without revenue or lot utilization', async () => {
    renderWithProviders(<SecurityDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Utilization')).toBeInTheDocument();
    });

    expect(screen.getByText("Today's Check-outs")).toBeInTheDocument();
    expect(screen.getByText('Slot Status')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.queryByText('Revenue Today')).not.toBeInTheDocument();
    expect(screen.queryByText('Lot Utilization')).not.toBeInTheDocument();
  });
});

describe('UserDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getOperatorMetrics).mockResolvedValue(userOperatorMetrics);
    vi.mocked(getRecentActivity).mockResolvedValue({
      items: userOperatorMetrics.recentActivity,
      nextCursor: null,
      hasMore: false,
    });
  });

  it('renders user hero KPIs and recent activity timeline', async () => {
    renderWithProviders(<UserDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('My Vehicles')).toBeInTheDocument();
    });

    expect(screen.getByText('Upcoming Bookings')).toBeInTheDocument();
    expect(screen.getByText('Active Parking Sessions')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.queryByText('Occupancy Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue Today')).not.toBeInTheDocument();
  });

  it('shows empty activity state when the feed has no items', async () => {
    vi.mocked(getRecentActivity).mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });

    renderWithProviders(<UserDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  it('shows activity error state when the feed request fails', async () => {
    vi.mocked(getRecentActivity).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<UserDashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load recent activity/i);
  });
});