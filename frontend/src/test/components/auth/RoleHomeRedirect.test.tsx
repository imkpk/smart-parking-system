import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { createMockUser, renderWithProviders } from '@/test/test-utils';
import { RoleHomeRedirect } from '@/components/auth/RoleHomeRedirect';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('RoleHomeRedirect', () => {
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

  it('redirects unauthenticated users to login', () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects admin users to the admin dashboard', () => {
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
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('redirects security users to the security dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SECURITY' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(
      <Routes>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/security/dashboard" element={<div>Security Dashboard</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
  });

  it('redirects regular users to the user dashboard', () => {
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
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/user/dashboard" element={<div>User Dashboard</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('User Dashboard')).toBeInTheDocument();
  });
});