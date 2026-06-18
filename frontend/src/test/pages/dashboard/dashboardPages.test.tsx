import { screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminSummary, getSlotStatusSummary } from '@/api/dashboardApi';
import { renderWithProviders } from '@/test/test-utils';
import { AdminDashboardPage } from '@/pages/dashboard/AdminDashboardPage';
import { SecurityDashboardPage } from '@/pages/dashboard/SecurityDashboardPage';
import { UserDashboardPage } from '@/pages/dashboard/UserDashboardPage';

vi.mock('@/api/dashboardApi', () => ({
  getAdminSummary: vi.fn(),
  getSlotStatusSummary: vi.fn(),
}));

const adminSummary = {
  totalUsers: 12,
  totalParkingLots: 3,
  totalSlots: 120,
  availableSlots: 80,
  occupiedSlots: 30,
  reservedSlots: 5,
  maintenanceSlots: 5,
  totalBookings: 45,
  activeParkingEvents: 8,
  completedParkingEvents: 20,
};

const slotSummary = {
  availableSlots: 75,
  occupiedSlots: 35,
  reservedSlots: 6,
  maintenanceSlots: 4,
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getAdminSummary).mockResolvedValue(adminSummary);
    vi.mocked(getSlotStatusSummary).mockResolvedValue(slotSummary);
  });

  it('shows access denied when admin summary returns forbidden', async () => {
    const error = new AxiosError('Forbidden');
    error.response = { status: 403 } as AxiosError['response'];
    vi.mocked(getAdminSummary).mockRejectedValue(error);

    renderWithProviders(<AdminDashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /access denied\. admin role is required/i,
    );
    expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
  });

  it('renders dashboard summary stats', async () => {
    renderWithProviders(<AdminDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Active Parking Events')).toBeInTheDocument();
  });
});

describe('SecurityDashboardPage', () => {
  it('renders placeholder dashboard content', () => {
    renderWithProviders(<SecurityDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByAltText('cityDriver illustration')).toBeInTheDocument();
  });
});

describe('UserDashboardPage', () => {
  it('renders placeholder dashboard content', () => {
    renderWithProviders(<UserDashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByAltText('booking illustration')).toBeInTheDocument();
  });
});