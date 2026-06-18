import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { createMockAuthValue, createMockUser, renderWithProviders } from '@/test/test-utils';
import { RoleHomeRedirect } from '@/components/auth/RoleHomeRedirect';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('RoleHomeRedirect', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthValue({ user: null, token: null, isAuthenticated: false }));
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

  it('redirects tenant admin users to the admin dashboard', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'TENANT_ADMIN' }) }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('redirects super admin users to the admin dashboard', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({
        user: createMockUser({ role: 'SUPER_ADMIN', organizationId: null, organization: null }),
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('redirects admin users to the admin dashboard', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'ADMIN' }) }),
    );

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
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'SECURITY' }) }),
    );

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
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'USER' }) }),
    );

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