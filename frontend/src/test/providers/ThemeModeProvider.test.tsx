import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeModeToggle } from '@/components/common/ThemeModeToggle';
import { expectContextHookToThrow, renderWithProviders } from '@/test/test-utils';
import { ThemeModeProvider, useThemeMode } from '@/providers/ThemeModeProvider';
import { TestThemeShell } from '@/test/TestThemeShell';

const STORAGE_KEY = 'smart-parking-color-mode';

describe('ThemeModeProvider', () => {
  it('throws when useThemeMode is used outside the provider', () => {
    expectContextHookToThrow(
      useThemeMode,
      'useThemeMode must be used within ThemeModeProvider',
    );
  });

  it('toggles theme mode and persists it to localStorage', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ThemeModeToggle />);

    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('restores the stored theme mode on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');

    function ModeConsumer() {
      const { mode } = useThemeMode();
      return <span data-testid="mode">{mode}</span>;
    }

    render(
      <ThemeModeProvider>
        <TestThemeShell>
          <ModeConsumer />
        </TestThemeShell>
      </ThemeModeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });
});