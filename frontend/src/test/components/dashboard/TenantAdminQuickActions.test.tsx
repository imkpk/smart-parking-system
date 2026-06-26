import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOnboardingStatus } from '@/api/dashboardApi';
import { TenantAdminQuickActions } from '@/components/dashboard/TenantAdminQuickActions';
import { useUserRole } from '@/hooks/useUserRole';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/api/dashboardApi', () => ({
  getOnboardingStatus: vi.fn(),
}));

vi.mock('@/api/usersApi', () => ({
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

const emptyOnboarding = {
  hasLot: false,
  hasFloor: false,
  hasSlot: false,
  hasTeamAccess: false,
  firstLotId: null,
  firstLotWithFloorsId: null,
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
    vi.mocked(getOnboardingStatus).mockResolvedValue(emptyOnboarding);
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
    expect(getOnboardingStatus).not.toHaveBeenCalled();
  });

  it('uses a single onboarding-status query instead of per-lot fan-out', async () => {
    renderWithProviders(<TenantAdminQuickActions />);

    await waitFor(() => {
      expect(getOnboardingStatus).toHaveBeenCalledTimes(1);
    });
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
    vi.mocked(getOnboardingStatus).mockResolvedValue({
      ...emptyOnboarding,
      hasLot: true,
      firstLotId: 1,
    });

    renderWithProviders(<TenantAdminQuickActions />);
    await expandQuickActions(user);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create floor/i })).toBeEnabled();
    });

    expect(screen.getByRole('button', { name: /create slot/i })).toBeDisabled();
  });

  it('enables create slot when a lot and floor exist', async () => {
    const user = userEvent.setup();
    vi.mocked(getOnboardingStatus).mockResolvedValue({
      hasLot: true,
      hasFloor: true,
      hasSlot: false,
      hasTeamAccess: false,
      firstLotId: 1,
      firstLotWithFloorsId: 1,
    });

    renderWithProviders(<TenantAdminQuickActions />);
    await expandQuickActions(user);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create slot/i })).toBeEnabled();
    });
  });
});