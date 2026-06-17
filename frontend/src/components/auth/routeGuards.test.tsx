import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { createMockUser, renderWithProviders } from '../../test/test-utils';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
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

  it('allows authenticated users to access protected content', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

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
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
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

  it('allows users with the required role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

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