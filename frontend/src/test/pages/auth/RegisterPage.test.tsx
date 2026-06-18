import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { createMockUser, renderWithProviders } from '@/test/test-utils';
import { RegisterPage } from '@/pages/auth/RegisterPage';

const registerMock = vi.fn();

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: registerMock,
      logout: vi.fn(),
    });
  });

  it('renders registration form fields', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i).closest('.MuiFormControl-fullWidth')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /role/i }).closest('.MuiFormControl-fullWidth')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('redirects to role home when already authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: registerMock,
      logout: vi.fn(),
    });

    renderWithProviders(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/user/dashboard" element={<div>User Home</div>} />
      </Routes>,
      { route: '/register' },
    );

    expect(screen.getByText('User Home')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /create account/i })).not.toBeInTheDocument();
  });

  it('shows validation error when registration fails', async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValueOnce(new Error('Registration failed'));

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'New User');
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not register this account/i,
    );
  });

  it('registers and navigates to the role home on success', async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValueOnce({
      accessToken: 'register-token',
      user: createMockUser({ role: 'ADMIN', email: 'admin@example.com' }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>,
      { route: '/register' },
    );

    await user.type(screen.getByLabelText(/name/i), 'Admin User');
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        name: 'Admin User',
        email: 'admin@example.com',
        phone: undefined,
        password: 'secret123',
        role: 'USER',
      });
    });

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();
  });
});