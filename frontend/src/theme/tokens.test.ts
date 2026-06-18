import { describe, expect, it } from 'vitest';
import { brand, parkingTokens, resolveThemeTokens } from './tokens';

describe('resolveThemeTokens', () => {
  it('returns light mode tokens with default brand name', () => {
    const tokens = resolveThemeTokens('light');

    expect(tokens.primary).toBe(parkingTokens.light.primary);
    expect(tokens.secondary).toBe(parkingTokens.light.secondary);
    expect(tokens.brandName).toBe(brand.name);
  });

  it('returns dark mode tokens with default brand name', () => {
    const tokens = resolveThemeTokens('dark');

    expect(tokens.primary).toBe(parkingTokens.dark.primary);
    expect(tokens.secondary).toBe(parkingTokens.dark.secondary);
    expect(tokens.brandName).toBe(brand.name);
  });

  it('applies brand overrides for primary, secondary, and name', () => {
    const tokens = resolveThemeTokens('light', {
      primary: '#AA0000',
      secondary: '#00AA00',
      name: 'Tenant Parking',
    });

    expect(tokens.primary).toBe('#AA0000');
    expect(tokens.button).toBe('#AA0000');
    expect(tokens.secondary).toBe('#00AA00');
    expect(tokens.brandName).toBe('Tenant Parking');
  });

  it('applies only a custom brand name when colors are not overridden', () => {
    const tokens = resolveThemeTokens('dark', { name: 'Custom Brand' });

    expect(tokens.brandName).toBe('Custom Brand');
    expect(tokens.primary).toBe(parkingTokens.dark.primary);
    expect(tokens.secondary).toBe(parkingTokens.dark.secondary);
  });

  it('applies only primary override without secondary', () => {
    const tokens = resolveThemeTokens('light', { primary: '#112233' });

    expect(tokens.primary).toBe('#112233');
    expect(tokens.button).toBe('#112233');
    expect(tokens.secondary).toBe(parkingTokens.light.secondary);
    expect(tokens.brandName).toBe(brand.name);
  });

  it('applies only secondary override without primary', () => {
    const tokens = resolveThemeTokens('dark', { secondary: '#AABBCC' });

    expect(tokens.secondary).toBe('#AABBCC');
    expect(tokens.primary).toBe(parkingTokens.dark.primary);
    expect(tokens.brandName).toBe(brand.name);
  });
});