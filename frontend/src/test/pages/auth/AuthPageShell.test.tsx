import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AuthPageShell } from '@/pages/auth/AuthPageShell';

describe('AuthPageShell', () => {
  it('renders title, subtitle, children, and theme toggle', () => {
    renderWithProviders(
      <AuthPageShell illustration="secureLogin" subtitle="Sign in to continue" title="Welcome back">
        <div>Form content</div>
      </AuthPageShell>,
    );

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument();
    expect(screen.getByText('Form content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByAltText('secureLogin illustration')).toBeInTheDocument();
  });
});