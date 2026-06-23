import { screen, waitFor } from '@testing-library/react';
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

function getChipForLabel(label: string) {
  return screen.getByText(label).closest('.MuiChip-root');
}

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

describe('TenantAdminQuickActions onboarding checklist', () => {
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

  it('shows disabled outlined chips while onboarding data is loading', () => {
    vi.mocked(getParkingLots).mockReturnValue(new Promise(() => undefined));

    renderWithProviders(<TenantAdminQuickActions />);

    const parkingLotChip = getChipForLabel('Create a parking lot');
    expect(parkingLotChip).toHaveClass('MuiChip-outlined');
    expect(parkingLotChip).toHaveAttribute('aria-label', 'Loading...');
    expect(screen.queryByText('Complete these steps to start accepting bookings.')).not.toBeInTheDocument();
  });

  it('does not fetch onboarding data for roles without tenant admin access', () => {
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
    expect(getUserSummary).not.toHaveBeenCalled();
  });

  it('marks all steps incomplete for a new tenant with no inventory or team members', async () => {
    renderWithProviders(<TenantAdminQuickActions />);

    await waitFor(() => {
      expect(getChipForLabel('Create a parking lot')).toHaveClass('MuiChip-outlined');
      expect(getChipForLabel('Create a parking lot')).not.toHaveClass('MuiChip-filledPrimary');
    });

    expect(getChipForLabel('Add a floor')).toHaveClass('MuiChip-outlined');
    expect(getChipForLabel('Create a slot')).toHaveClass('MuiChip-outlined');
    expect(getChipForLabel('Add team access')).toHaveClass('MuiChip-outlined');

    await waitFor(() => {
      expect(
        screen.getByText('Complete these steps to start accepting bookings.'),
      ).toBeInTheDocument();
    });
  });

  it('marks parking lot complete while floor, slot, and team access stay incomplete', async () => {
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

    await waitFor(() => {
      expect(getChipForLabel('Create a parking lot')).toHaveClass('MuiChip-filledPrimary');
    });

    expect(getChipForLabel('Add a floor')).toHaveClass('MuiChip-outlined');
    expect(getChipForLabel('Create a slot')).toHaveClass('MuiChip-outlined');
    expect(getChipForLabel('Add team access')).toHaveClass('MuiChip-outlined');
  });

  it('marks floor complete without marking slot complete', async () => {
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

    await waitFor(() => {
      expect(getChipForLabel('Add a floor')).toHaveClass('MuiChip-filledPrimary');
    });

    expect(getChipForLabel('Create a slot')).toHaveClass('MuiChip-outlined');
  });

  it('marks slot complete only when slots exist', async () => {
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
    vi.mocked(getSlots).mockResolvedValue([
      {
        id: 20,
        slotNumber: 'A-01',
        slotType: 'CAR',
        status: 'AVAILABLE',
        floorId: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderWithProviders(<TenantAdminQuickActions />);

    await waitFor(() => {
      expect(getChipForLabel('Create a slot')).toHaveClass('MuiChip-filledPrimary');
    });
  });

  it('marks team access complete when non-tenant-admin accounts exist', async () => {
    vi.mocked(getUserSummary).mockResolvedValue({
      totalUsers: 3,
      activeUsers: 3,
      inactiveUsers: 0,
      tenantAdmins: 1,
      admins: 1,
      security: 1,
      users: 0,
    });

    renderWithProviders(<TenantAdminQuickActions />);

    await waitFor(() => {
      expect(getChipForLabel('Add team access')).toHaveClass('MuiChip-filledPrimary');
    });
  });

  it('shows setup complete hint when every checklist step is complete', async () => {
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
    vi.mocked(getSlots).mockResolvedValue([
      {
        id: 20,
        slotNumber: 'A-01',
        slotType: 'CAR',
        status: 'AVAILABLE',
        floorId: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    vi.mocked(getUserSummary).mockResolvedValue({
      totalUsers: 2,
      activeUsers: 2,
      inactiveUsers: 0,
      tenantAdmins: 1,
      admins: 0,
      security: 0,
      users: 1,
    });

    renderWithProviders(<TenantAdminQuickActions />);

    await waitFor(() => {
      expect(
        screen.getByText('Setup complete. You can now manage bookings and gate operations.'),
      ).toBeInTheDocument();
    });
  });
});