import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentBranding, updateOrganizationBranding } from '@/api/organizationsApi';
import { useAuth } from '@/providers/AuthProvider';
import { useTenantBranding } from '@/providers/TenantBrandingProvider';
import { createMockUser, renderWithProviders } from '@/test/test-utils';
import { BrandingSettingsPage } from '@/pages/settings/BrandingSettingsPage';

vi.mock('@/api/organizationsApi', () => ({
  getCurrentBranding: vi.fn(),
  getPublicBranding: vi.fn(),
  updateOrganizationBranding: vi.fn(),
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/providers/TenantBrandingProvider', () => ({
  useTenantBranding: vi.fn(),
}));

const branding = {
  name: 'Default Organization',
  slug: 'default',
  logoUrl: null,
  primaryColor: '#1565C0',
  secondaryColor: null,
  accentColor: null,
  loginTitle: 'Sign in',
  supportEmail: null,
};

describe('BrandingSettingsPage', () => {
  const refreshBranding = vi.fn();

  beforeEach(() => {
    refreshBranding.mockReset();
    vi.mocked(useTenantBranding).mockReturnValue({
      branding: { name: 'Default Organization', loginTitle: 'Sign in' },
      isLoading: false,
      error: null,
      tenantSlug: null,
      setTenantSlug: vi.fn(),
      refreshBranding,
    });
    vi.mocked(getCurrentBranding).mockResolvedValue(branding);
    vi.mocked(updateOrganizationBranding).mockResolvedValue({
      ...branding,
      loginTitle: 'Welcome back',
    });
  });

  it('shows organization-required message for super admin without org context', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SUPER_ADMIN', organizationId: null, organization: null }),
      token: 'token',
      organizationId: null,
      organization: null,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BrandingSettingsPage />);

    expect(
      screen.getByText(/organization context is required to manage branding settings/i),
    ).toBeInTheDocument();
  });

  it('loads existing branding for tenant admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'TENANT_ADMIN' }),
      token: 'token',
      organizationId: 1,
      organization: { id: 1, name: 'Default Organization', slug: 'default' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BrandingSettingsPage />);

    expect(await screen.findByDisplayValue('#1565C0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sign in')).toBeInTheDocument();
  });

  it('shows validation error for invalid color', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'TENANT_ADMIN' }),
      token: 'token',
      organizationId: 1,
      organization: { id: 1, name: 'Default Organization', slug: 'default' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BrandingSettingsPage />);
    await screen.findByDisplayValue('#1565C0');

    await user.clear(screen.getByLabelText(/primary color/i));
    await user.type(screen.getByLabelText(/primary color/i), 'blue');
    await user.click(screen.getByRole('button', { name: /save branding/i }));

    expect(await screen.findByText(/valid hex color/i)).toBeInTheDocument();
    expect(updateOrganizationBranding).not.toHaveBeenCalled();
  });

  it('saves branding and refreshes context', async () => {
    const user = userEvent.setup();
    refreshBranding.mockResolvedValue(undefined);
    vi.mocked(updateOrganizationBranding).mockResolvedValue({
      ...branding,
      loginTitle: 'Welcome back',
    });
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'TENANT_ADMIN' }),
      token: 'token',
      organizationId: 1,
      organization: { id: 1, name: 'Default Organization', slug: 'default' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BrandingSettingsPage />);
    await screen.findByDisplayValue('#1565C0');

    fireEvent.change(screen.getByLabelText(/login title/i), {
      target: { value: 'Welcome back' },
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('Welcome back')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /save branding/i }));

    await waitFor(() => {
      expect(updateOrganizationBranding).toHaveBeenCalled();
    });
    expect(vi.mocked(updateOrganizationBranding).mock.calls[0]?.[0]).toMatchObject({
      loginTitle: 'Welcome back',
    });
    expect(refreshBranding).toHaveBeenCalled();
    expect(await screen.findByText(/branding settings saved/i)).toBeInTheDocument();
  });

  it('shows save error when API fails', async () => {
    const user = userEvent.setup();
    vi.mocked(updateOrganizationBranding).mockRejectedValueOnce(new Error('network'));
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'TENANT_ADMIN' }),
      token: 'token',
      organizationId: 1,
      organization: { id: 1, name: 'Default Organization', slug: 'default' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BrandingSettingsPage />);
    await screen.findByDisplayValue('#1565C0');
    await user.click(screen.getByRole('button', { name: /save branding/i }));

    expect(await screen.findByText(/unable to save branding settings/i)).toBeInTheDocument();
  });
});