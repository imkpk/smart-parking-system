import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
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

  beforeEach(() => {
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

  it('renders admin navigation items and logout button', async () => {
    const user = userEvent.setup();

    renderAppLayout('/admin/dashboard');

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /parking lots/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^vehicles$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /parking events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payments/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /security dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /user dashboard/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /logout/i }));
    expect(logout).toHaveBeenCalledTimes(1);
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

    expect(screen.getByRole('link', { name: /user dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^vehicles$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /bookings/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /security dashboard/i })).not.toBeInTheDocument();
  });

  it('collapses and expands the desktop sidebar', async () => {
    const user = userEvent.setup();
    renderAppLayout('/admin/dashboard');

    expect(screen.getAllByText('Admin Dashboard').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expand sidebar/i }));
    expect(screen.getAllByText('Admin Dashboard').length).toBeGreaterThan(0);
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