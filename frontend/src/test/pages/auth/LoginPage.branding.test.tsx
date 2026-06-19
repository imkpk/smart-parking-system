import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTenantBranding } from '@/providers/TenantBrandingProvider';
import { useAuth } from '@/providers/AuthProvider';
import { renderWithProviders } from '@/test/test-utils';
import { LoginPage } from '@/pages/auth/LoginPage';

vi.mock('@/hooks/useTenantSlugFromRoute', () => ({
  useTenantSlugFromRoute: vi.fn(),
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/providers/TenantBrandingProvider', () => ({
  useTenantBranding: vi.fn(),
}));

describe('LoginPage branding', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      organizationId: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('renders fallback branding by default', () => {
    vi.mocked(useTenantBranding).mockReturnValue({
      branding: { name: 'Smart Parking', loginTitle: 'Sign in' },
      isLoading: false,
      error: null,
      tenantSlug: null,
      setTenantSlug: vi.fn(),
      refreshBranding: vi.fn(),
    });

    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getAllByText('Smart Parking').length).toBeGreaterThan(0);
    expect(screen.getByText('Find, Book, Park')).toBeInTheDocument();
  });

  it('renders tenant branding when slug branding is available', async () => {
    vi.mocked(useTenantBranding).mockReturnValue({
      branding: {
        name: 'Acme Parking',
        loginTitle: 'Welcome to Acme',
        logoUrl: 'https://cdn.example.com/logo.svg',
      },
      isLoading: false,
      error: null,
      tenantSlug: 'acme-parking',
      setTenantSlug: vi.fn(),
      refreshBranding: vi.fn(),
    });

    renderWithProviders(<LoginPage />, { route: '/login/acme-parking' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome to acme/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText('Acme Parking').length).toBeGreaterThan(0);
  });

  it('does not crash when tenant branding lookup fails', () => {
    vi.mocked(useTenantBranding).mockReturnValue({
      branding: { name: 'Smart Parking', loginTitle: 'Sign in' },
      isLoading: false,
      error: 'Unable to load tenant branding.',
      tenantSlug: 'missing-tenant',
      setTenantSlug: vi.fn(),
      refreshBranding: vi.fn(),
    });

    renderWithProviders(<LoginPage />, { route: '/login/missing-tenant' });

    expect(screen.getByRole('alert')).toHaveTextContent(/unable to load tenant branding/i);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});