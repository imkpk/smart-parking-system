import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentBranding, getPublicBranding } from '@/api/organizationsApi';
import { getCurrentUser } from '@/api/authApi';
import { DEFAULT_BRANDING } from '@/constants/defaultBranding';
import { tokenStorage } from '@/lib/tokenStorage';
import { tenantSlugStorage } from '@/lib/tenantSlugStorage';
import { AuthProvider } from '@/providers/AuthProvider';
import {
  TenantBrandingProvider,
  useTenantBranding,
} from '@/providers/TenantBrandingProvider';
import { ThemeModeProvider } from '@/providers/ThemeModeProvider';
import {
  createMockUser,
  createTestQueryClient,
  expectContextHookToThrow,
} from '@/test/test-utils';

vi.mock('@/api/organizationsApi', () => ({
  getPublicBranding: vi.fn(),
  getCurrentBranding: vi.fn(),
  updateOrganizationBranding: vi.fn(),
}));

vi.mock('@/api/authApi', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
}));

function renderTenantBranding(ui: React.ReactNode) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AuthProvider>
          <TenantBrandingProvider>{ui}</TenantBrandingProvider>
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>,
  );
}

describe('TenantBrandingProvider', () => {
  beforeEach(() => {
    tokenStorage.clear();
    tenantSlugStorage.clear();
    vi.mocked(getCurrentUser).mockResolvedValue(createMockUser());
    vi.mocked(getPublicBranding).mockReset();
    vi.mocked(getCurrentBranding).mockReset();
  });

  it('throws when useTenantBranding is used outside the provider', () => {
    expectContextHookToThrow(
      useTenantBranding,
      'useTenantBranding must be used within TenantBrandingProvider',
    );
  });

  it('returns default branding when no tenant slug exists', async () => {
    function BrandingConsumer() {
      const { branding } = useTenantBranding();
      return <span data-testid="brand-name">{branding.name}</span>;
    }

    renderTenantBranding(<BrandingConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('brand-name')).toHaveTextContent(DEFAULT_BRANDING.name);
    });
    expect(getPublicBranding).not.toHaveBeenCalled();
  });

  it('fetches public branding when tenant slug is set pre-auth', async () => {
    vi.mocked(getPublicBranding).mockResolvedValue({
      name: 'Acme Parking',
      slug: 'acme-parking',
      primaryColor: '#112233',
    });

    function BrandingConsumer() {
      const { branding, setTenantSlug } = useTenantBranding();

      return (
        <div>
          <button onClick={() => setTenantSlug('acme-parking')}>Set slug</button>
          <span data-testid="brand-name">{branding.name}</span>
        </div>
      );
    }

    const user = userEvent.setup();
    renderTenantBranding(<BrandingConsumer />);

    await user.click(screen.getByRole('button', { name: /set slug/i }));

    await waitFor(() => {
      expect(screen.getByTestId('brand-name')).toHaveTextContent('Acme Parking');
    });
    expect(getPublicBranding).toHaveBeenCalledWith('acme-parking');
  });

  it('uses authenticated organization branding when logged in', async () => {
    tokenStorage.set('token-123');
    vi.mocked(getCurrentUser).mockResolvedValue(
      createMockUser({
        organizationId: 1,
        organization: { id: 1, name: 'Tenant Org', slug: 'tenant-org' },
      }),
    );
    vi.mocked(getCurrentBranding).mockResolvedValue({
      name: 'Tenant Org',
      slug: 'tenant-org',
      primaryColor: '#AABBCC',
    });

    function BrandingConsumer() {
      const { branding } = useTenantBranding();
      return <span data-testid="brand-name">{branding.name}</span>;
    }

    renderTenantBranding(<BrandingConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('brand-name')).toHaveTextContent('Tenant Org');
    });
    expect(getCurrentBranding).toHaveBeenCalled();
  });

  it('falls back safely when branding API fails', async () => {
    vi.mocked(getPublicBranding).mockRejectedValue(new Error('network'));

    function BrandingConsumer() {
      const { branding, setTenantSlug, error } = useTenantBranding();

      return (
        <div>
          <button onClick={() => setTenantSlug('missing-tenant')}>Set slug</button>
          <span data-testid="brand-name">{branding.name}</span>
          <span data-testid="error">{error ?? 'none'}</span>
        </div>
      );
    }

    const user = userEvent.setup();
    renderTenantBranding(<BrandingConsumer />);

    await user.click(screen.getByRole('button', { name: /set slug/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Unable to load tenant branding.');
    });
    expect(screen.getByTestId('brand-name')).toHaveTextContent(DEFAULT_BRANDING.name);
  });
});