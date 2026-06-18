import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { createMockAuthValue, createMockUser, renderWithProviders } from '@/test/test-utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleRoute } from '@/components/auth/RoleRoute';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: null, token: null, isAuthenticated: false }),
    );
  });

  it('redirects unauthenticated users away from protected content', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/bookings" element={<div>Bookings Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { route: '/bookings' },
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Bookings Content')).not.toBeInTheDocument();
  });

  it('shows loading spinner while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
      }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/bookings" element={<div>Bookings Content</div>} />
        </Route>
      </Routes>,
      { route: '/bookings' },
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Bookings Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('allows authenticated users to access protected content', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'USER' }) }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/bookings" element={<div>Bookings Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { route: '/bookings' },
    );

    expect(screen.getByText('Bookings Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});

describe('RoleRoute', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'USER' }) }),
    );
  });

  it('blocks users without the required role', () => {
    renderWithProviders(
      <Routes>
        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
        </Route>
      </Routes>,
      { route: '/admin/dashboard' },
    );

    expect(screen.getByText(/you do not have access to this page/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('shows login prompt when user is null', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: null, token: 'token', isAuthenticated: true }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
        </Route>
      </Routes>,
      { route: '/admin/dashboard' },
    );

    expect(screen.getByText(/you do not have access to this page/i)).toBeInTheDocument();
    expect(screen.getByText('Please login again.')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('allows tenant admin users with tenant admin access', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'TENANT_ADMIN' }) }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN']} />}>
          <Route path="/parking-lots" element={<div>Parking Lots</div>} />
        </Route>
      </Routes>,
      { route: '/parking-lots' },
    );

    expect(screen.getByText('Parking Lots')).toBeInTheDocument();
  });

  it('allows users with the required role', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'ADMIN' }) }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
        </Route>
      </Routes>,
      { route: '/admin/dashboard' },
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/you do not have access/i)).not.toBeInTheDocument();
  });
});