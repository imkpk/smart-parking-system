import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AuthPageShell } from '@/pages/auth/AuthPageShell';

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

describe('AuthPageShell', () => {
  it('renders title, subtitle, children, and theme toggle', () => {
    renderWithProviders(
      <AuthPageShell illustration="secureLogin" subtitle="Sign in to continue" title="Welcome back">
        <div>Form content</div>
      </AuthPageShell>,
    );

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getAllByText('Smart Parking').length).toBeGreaterThan(0);
    expect(screen.getByText('Find • Book • Park')).toBeInTheDocument();
    expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument();
    expect(screen.getByText('Form content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByAltText('secureLogin illustration')).toBeInTheDocument();
  });
});