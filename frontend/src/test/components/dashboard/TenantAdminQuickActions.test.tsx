import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFloors } from '@/api/floorsApi';
import { getParkingLots } from '@/api/parkingLotsApi';
import { getSlots } from '@/api/slotsApi';
import { getUserSummary } from '@/api/usersApi';
import { TenantAdminQuickActions } from '@/components/dashboard/TenantAdminQuickActions';
import { useUserRole } from '@/hooks/useUserRole';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/api/parkingLotsApi', () => ({
  getParkingLots: vi.fn(),
}));

vi.mock('@/api/floorsApi', () => ({
  getFloors: vi.fn(),
}));

vi.mock('@/api/slotsApi', () => ({
  getSlots: vi.fn(),
}));

vi.mock('@/api/usersApi', () => ({
  getUserSummary: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: vi.fn(() => ({
    user: { role: 'TENANT_ADMIN' },
    isTenantAdmin: true,
    isOperationalAdmin: true,
    isAdmin: false,
    isSecurity: false,
    isUser: false,
    isSuperAdmin: false,
    canOperateParkingEvents: true,
    canViewOperationalPayments: true,
  })),
}));

const tenantAdminRole = {
  user: { role: 'TENANT_ADMIN' as const },
  isTenantAdmin: true,
  isOperationalAdmin: true,
  isAdmin: false,
  isSecurity: false,
  isUser: false,
  isSuperAdmin: false,
  canOperateParkingEvents: true,
  canViewOperationalPayments: true,
};

async function expandQuickActions(user: ReturnType<typeof userEvent.setup>) {
  const header = screen.getByRole('button', { name: /^quick actions$/i });
  if (header.getAttribute('aria-expanded') === 'false') {
    await user.click(header);
    await waitFor(() => {
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });
  }
}

describe('TenantAdminQuickActions', () => {
  beforeEach(() => {
    vi.mocked(useUserRole).mockReturnValue(tenantAdminRole);
    vi.mocked(getParkingLots).mockResolvedValue([]);
    vi.mocked(getFloors).mockResolvedValue([]);
    vi.mocked(getSlots).mockResolvedValue([]);
    vi.mocked(getUserSummary).mockResolvedValue({
      totalUsers: 1,
      activeUsers: 1,
      inactiveUsers: 0,
      tenantAdmins: 1,
      admins: 0,
      security: 0,
      users: 0,
    });
  });

  it('does not render for roles without tenant admin access', () => {
    vi.mocked(useUserRole).mockReturnValue({
      user: { role: 'USER' },
      isTenantAdmin: false,
      isOperationalAdmin: false,
      isAdmin: false,
      isSecurity: false,
      isUser: true,
      isSuperAdmin: false,
      canOperateParkingEvents: false,
      canViewOperationalPayments: false,
    });

    const { container } = renderWithProviders(<TenantAdminQuickActions />);

    expect(container).toBeEmptyDOMElement();
    expect(getParkingLots).not.toHaveBeenCalled();
  });

  it('renders quick action tiles after expanding the panel', async () => {
    const user = userEvent.setup();

    renderWithProviders(<TenantAdminQuickActions />);
    await expandQuickActions(user);

    expect(screen.getByText('Create Parking Lot')).toBeInTheDocument();
    expect(screen.getByText('Create Floor')).toBeInTheDocument();
    expect(screen.getByText('Create Slot')).toBeInTheDocument();
    expect(screen.queryByText('Getting started checklist')).not.toBeInTheDocument();
  });

  it('disables create floor and slot actions when no parking lot exists', async () => {
    const user = userEvent.setup();

    renderWithProviders(<TenantAdminQuickActions />);
    await expandQuickActions(user);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create floor/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /create slot/i })).toBeDisabled();
    });

    expect(screen.getByText('Create a parking lot first.')).toBeInTheDocument();
    expect(screen.getByText('Create a floor first.')).toBeInTheDocument();
  });

  it('enables create floor when a parking lot exists', async () => {
    const user = userEvent.setup();
    vi.mocked(getParkingLots).mockResolvedValue([
      {
        id: 1,
        name: 'Lot A',
        type: 'MALL',
        city: 'Hyderabad',
        organizationId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderWithProviders(<TenantAdminQuickActions />);
    await expandQuickActions(user);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create floor/i })).toBeEnabled();
    });

    expect(screen.getByRole('button', { name: /create slot/i })).toBeDisabled();
  });

  it('enables create slot when a lot and floor exist', async () => {
    const user = userEvent.setup();
    vi.mocked(getParkingLots).mockResolvedValue([
      {
        id: 1,
        name: 'Lot A',
        type: 'MALL',
        city: 'Hyderabad',
        organizationId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    vi.mocked(getFloors).mockResolvedValue([
      {
        id: 10,
        name: 'Ground',
        parkingLotId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderWithProviders(<TenantAdminQuickActions />);
    await expandQuickActions(user);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create slot/i })).toBeEnabled();
    });
  });
});