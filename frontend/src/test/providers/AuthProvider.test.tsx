import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, login, register } from '@/api/authApi';
import { tokenStorage } from '@/lib/tokenStorage';
import {
  createMockOrganization,
  createMockUser,
  createTestQueryClient,
} from '@/test/test-utils';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

vi.mock('@/api/authApi', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
}));

function renderAuthProvider(ui: React.ReactNode) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(createMockUser());
  });

  it('throws when useAuth is used outside the provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider',
    );
  });

  it('logs in and persists the authenticated user', async () => {
    const user = userEvent.setup();
    const authResponse = {
      accessToken: 'new-token',
      user: createMockUser({ email: 'admin@example.com' }),
    };
    vi.mocked(login).mockResolvedValue(authResponse);
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse.user);

    function LoginConsumer() {
      const { login: loginUser, user: currentUser, isAuthenticated } = useAuth();

      return (
        <div>
          <button
            onClick={() =>
              loginUser({ email: 'admin@example.com', password: 'secret123' })
            }
          >
            Login
          </button>
          <span data-testid="email">{currentUser?.email ?? 'none'}</span>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
        </div>
      );
    }

    renderAuthProvider(<LoginConsumer />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('admin@example.com');
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(tokenStorage.get()).toBe('new-token');
    expect(vi.mocked(login).mock.calls[0]?.[0]).toEqual({
      email: 'admin@example.com',
      password: 'secret123',
    });
  });

  it('registers and persists the authenticated user', async () => {
    const user = userEvent.setup();
    const authResponse = {
      accessToken: 'register-token',
      user: createMockUser({ role: 'USER', email: 'new@example.com' }),
    };
    vi.mocked(register).mockResolvedValue(authResponse);

    function RegisterConsumer() {
      const { register: registerUser, user: currentUser } = useAuth();

      return (
        <button
          onClick={() =>
            registerUser({
              name: 'New User',
              email: 'new@example.com',
              password: 'secret123',
            })
          }
        >
          Register
        </button>
      );
    }

    renderAuthProvider(<RegisterConsumer />);
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(tokenStorage.get()).toBe('register-token');
    });
    expect(vi.mocked(register).mock.calls[0]?.[0]).toEqual({
      name: 'New User',
      email: 'new@example.com',
      password: 'secret123',
    });
  });

  it('logs out and clears stored auth state', async () => {
    const user = userEvent.setup();
    tokenStorage.set('existing-token');

    function LogoutConsumer() {
      const { logout, token } = useAuth();

      return (
        <div>
          <button onClick={logout}>Logout</button>
          <span data-testid="token">{token ?? 'none'}</span>
        </div>
      );
    }

    renderAuthProvider(<LogoutConsumer />);

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(tokenStorage.get()).toBeNull();
  });

  it('reports loading while the current user is being fetched', async () => {
    let resolveUser: (user: ReturnType<typeof createMockUser>) => void = () => undefined;
    vi.mocked(getCurrentUser).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUser = resolve;
        }),
    );
    tokenStorage.set('existing-token');

    function LoadingConsumer() {
      const { isLoading } = useAuth();
      return <span data-testid="loading">{String(isLoading)}</span>;
    }

    renderAuthProvider(<LoadingConsumer />);

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    resolveUser(createMockUser());
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  it('exposes tenant context from login response', async () => {
    const user = userEvent.setup();
    const organization = createMockOrganization({ id: 7, name: 'Metro Mall', slug: 'metro-mall' });
    const authResponse = {
      accessToken: 'tenant-token',
      user: createMockUser({
        organizationId: 7,
        organization,
        role: 'TENANT_ADMIN',
      }),
    };
    vi.mocked(login).mockResolvedValue(authResponse);
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse.user);

    function TenantConsumer() {
      const { login: loginUser, organizationId, organization: tenant } = useAuth();

      return (
        <div>
          <button
            onClick={() =>
              loginUser({ email: 'tenant@example.com', password: 'secret123' })
            }
          >
            Login
          </button>
          <span data-testid="organization-id">{organizationId ?? 'none'}</span>
          <span data-testid="organization-name">{tenant?.name ?? 'none'}</span>
        </div>
      );
    }

    renderAuthProvider(<TenantConsumer />);
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('organization-id')).toHaveTextContent('7');
    });
    expect(screen.getByTestId('organization-name')).toHaveTextContent('Metro Mall');
  });

  it('clears tenant context on logout', async () => {
    const user = userEvent.setup();
    tokenStorage.set('existing-token');
    vi.mocked(getCurrentUser).mockResolvedValue(
      createMockUser({
        organizationId: 3,
        organization: createMockOrganization({ id: 3, name: 'Org Three' }),
      }),
    );

    function LogoutTenantConsumer() {
      const { logout, organizationId, organization } = useAuth();

      return (
        <div>
          <button onClick={logout}>Logout</button>
          <span data-testid="organization-id">{organizationId ?? 'none'}</span>
          <span data-testid="organization-name">{organization?.name ?? 'none'}</span>
        </div>
      );
    }

    renderAuthProvider(<LogoutTenantConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('organization-id')).toHaveTextContent('3');
    });

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(screen.getByTestId('organization-id')).toHaveTextContent('none');
    expect(screen.getByTestId('organization-name')).toHaveTextContent('none');
  });

  it('handles missing organization data without crashing', async () => {
    tokenStorage.set('existing-token');
    vi.mocked(getCurrentUser).mockResolvedValue(
      createMockUser({ organizationId: null, organization: null, role: 'SUPER_ADMIN' }),
    );

    function MissingOrgConsumer() {
      const { organizationId, organization, user } = useAuth();

      return (
        <div>
          <span data-testid="organization-id">{organizationId ?? 'none'}</span>
          <span data-testid="organization-name">{organization?.name ?? 'none'}</span>
          <span data-testid="role">{user?.role ?? 'none'}</span>
        </div>
      );
    }

    renderAuthProvider(<MissingOrgConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('SUPER_ADMIN');
    });
    expect(screen.getByTestId('organization-id')).toHaveTextContent('none');
    expect(screen.getByTestId('organization-name')).toHaveTextContent('none');
  });

  it('logs out when an unauthorized event is dispatched', async () => {
    tokenStorage.set('existing-token');

    function UnauthorizedConsumer() {
      const { token, user } = useAuth();

      return (
        <div>
          <span data-testid="token">{token ?? 'none'}</span>
          <span data-testid="user">{user?.email ?? 'none'}</span>
        </div>
      );
    }

    renderAuthProvider(<UnauthorizedConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user@example.com');
    });

    window.dispatchEvent(new Event('smart-parking:unauthorized'));

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('none');
    });
    expect(tokenStorage.get()).toBeNull();
  });
});