import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIDEBAR_AUTO_COLLAPSE_MS } from '@/hooks/useSidebarAutoCollapse';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { userFacingLabels } from '@/lib/userFacingLabels';
import { createMockUser, renderWithProviders } from '@/test/test-utils';

const useMediaQueryMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  return {
    ...actual,
    useMediaQuery: (...args: unknown[]) => useMediaQueryMock(...args),
  };
});

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/providers/TenantBrandingProvider', () => ({
  useTenantBranding: vi.fn(() => ({
    branding: { name: 'Smart Parking', loginTitle: 'Sign in' },
    isLoading: false,
    error: null,
    tenantSlug: null,
    setTenantSlug: vi.fn(),
    refreshBranding: vi.fn(),
  })),
}));

import { AppLayout } from '@/components/layout/AppLayout';

function renderAppLayout(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/admin/dashboard" element={<div>Dashboard Content</div>} />
        <Route path="/security/dashboard" element={<div>Security Content</div>} />
        <Route path="/user/dashboard" element={<div>User Content</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Route>
    </Routes>,
    { route },
  );
}

describe('AppLayout', () => {
  const logout = vi.fn();

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useRealTimers();
    useMediaQueryMock.mockReturnValue(false);
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN', name: 'Admin User' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });
  });

  it('title-cases lowercase user names in the top bar', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN', name: 'pratibha' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });

    renderAppLayout('/admin/dashboard');

    expect(screen.getByText('Pratibha')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders admin navigation items and logout button', async () => {
    const user = userEvent.setup();

    renderAppLayout('/admin/dashboard');

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /support inbox/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /parking lots/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^vehicles$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /parking events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payments/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /security dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: userFacingLabels.dashboard })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^branding$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /logout/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('shows branding navigation for tenant admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'TENANT_ADMIN', name: 'Tenant Admin' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });

    renderAppLayout('/admin/dashboard');

    expect(screen.getByRole('link', { name: /support inbox/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /parking lots/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^branding$/i })).toBeInTheDocument();
  });

  it('renders security navigation items', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SECURITY', name: 'Security User' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });

    renderAppLayout('/security/dashboard');

    expect(screen.getByRole('link', { name: /security dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /security messages/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /parking events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payments/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /parking lots/i })).not.toBeInTheDocument();
  });

  it('renders user navigation items', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', name: 'Regular User' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });

    renderAppLayout('/user/dashboard');

    expect(screen.getByRole('link', { name: userFacingLabels.dashboard })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^support$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^vehicles$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: userFacingLabels.bookings })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: userFacingLabels.parkingHistory })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: userFacingLabels.paymentHistory })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /security dashboard/i })).not.toBeInTheDocument();
  });

  it('starts with the desktop sidebar collapsed by default', () => {
    renderAppLayout('/admin/dashboard');

    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /collapse sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  it('collapses and expands the desktop sidebar', async () => {
    const user = userEvent.setup();
    renderAppLayout('/admin/dashboard');

    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expand sidebar/i }));
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
    expect(screen.getAllByText('Admin Dashboard').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('auto-collapses the expanded desktop sidebar after inactivity', () => {
    vi.useFakeTimers();

    try {
      renderAppLayout('/admin/dashboard');

      fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i }));
      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(SIDEBAR_AUTO_COLLAPSE_MS);
      });

      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /collapse sidebar/i })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets the desktop auto-collapse timer on sidebar interaction', () => {
    vi.useFakeTimers();

    try {
      renderAppLayout('/admin/dashboard');

      fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i }));

      act(() => {
        vi.advanceTimersByTime(SIDEBAR_AUTO_COLLAPSE_MS - 1_000);
      });

      fireEvent.mouseMove(screen.getByRole('link', { name: /admin dashboard/i }));

      act(() => {
        vi.advanceTimersByTime(1_000);
      });

      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(SIDEBAR_AUTO_COLLAPSE_MS);
      });

      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the mobile navigation drawer', async () => {
    useMediaQueryMock.mockReturnValue(true);
    const user = userEvent.setup();
    renderAppLayout('/admin/dashboard');

    expect(screen.getByRole('button', { name: /open navigation/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open navigation/i }));

    expect(screen.getAllByRole('link', { name: /parking lots/i }).length).toBeGreaterThan(0);
  });
});