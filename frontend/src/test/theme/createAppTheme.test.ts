import { describe, expect, it } from 'vitest';
import { createAppTheme } from '@/theme/createAppTheme';

describe('createAppTheme', () => {
  it('creates a light theme', () => {
    const theme = createAppTheme('light');

    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary.main).toBeTruthy();
    expect(theme.palette.background.default).toBeTruthy();
    expect(theme.typography.fontFamily).toContain('Inter');
  });

  it('creates a dark theme', () => {
    const theme = createAppTheme('dark');

    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main).toBeTruthy();
    expect(theme.palette.background.default).toBeTruthy();
    expect(theme.palette.text.primary).toBeTruthy();
  });

  it('applies brand overrides to the generated theme', () => {
    const theme = createAppTheme('light', {
      primary: '#AA0000',
      secondary: '#00AA00',
      name: 'Tenant Parking',
    });

    expect(theme.palette.primary.main).toBe('#AA0000');
    expect(theme.palette.secondary.main).toBe('#00AA00');
  });
});