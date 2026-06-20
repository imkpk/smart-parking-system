import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { createMockUser, renderWithProviders } from '@/test/test-utils';
import { LoginPage } from '@/pages/auth/LoginPage';

const loginMock = vi.fn();

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useTenantSlugFromRoute', () => ({
  useTenantSlugFromRoute: vi.fn(),
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: loginMock,
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('renders email and password form fields', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or mobile number/i)).toBeInTheDocument();
    expect(screen.getByTestId('login-password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i).closest('.MuiFormControl-fullWidth')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error when login fails', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email or mobile number/i), 'user@example.com');
    await user.type(screen.getByTestId('login-password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email, mobile number, or password/i);
    expect(loginMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'wrong-password',
    });
  });

  it('redirects to role home when already authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: loginMock,
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<div>Admin Home</div>} />
      </Routes>,
      { route: '/login' },
    );

    expect(screen.getByText('Admin Home')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('calls login with submitted credentials on success', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce({
      accessToken: 'test-token',
      user: createMockUser({ role: 'ADMIN' }),
    });

    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByTestId('login-password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'secret123',
      });
    });
  });
});