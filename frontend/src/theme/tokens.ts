import { alpha, PaletteMode } from '@mui/material';

/**
 * Smart Parking design tokens — edit this file to rebrand the entire app.
 * All colors, radii, and motion flow through createAppTheme(); do not hardcode per page.
 *
 * Phase 2 tenant white-label: pass ThemeBrandOverrides into createAppTheme().
 */
export const brand = {
  name: 'Smart Parking',
  tagline: 'Management System',
} as const;

export const shapeTokens = {
  borderRadius: 10,
  cardRadius: 12,
  buttonRadius: 10,
  buttonRadiusSmall: 8,
  buttonRadiusLarge: 12,
} as const;

export const motionTokens = {
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  fast: '120ms',
  normal: '160ms',
  slow: '240ms',
} as const;

export const typographyTokens = {
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h4: {
    fontWeight: 700,
  },
  h5: {
    fontWeight: 700,
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
} as const;

export const parkingTokens = {
  light: {
    primary: '#1565C0',
    primaryLight: '#42A5F5',
    primaryDark: '#0D47A1',
    button: '#1565C0',
    buttonHover: '#1976D2',
    buttonActive: '#0D47A1',
    secondary: '#F9A825',
    secondaryLight: '#FDD835',
    secondaryDark: '#EF6C00',
    success: '#2E7D32',
    successLight: '#4CAF50',
    successDark: '#1B5E20',
    warning: '#ED6C02',
    warningLight: '#FF9800',
    warningDark: '#E65100',
    info: '#0288D1',
    infoLight: '#03A9F4',
    infoDark: '#01579B',
    error: '#D32F2F',
    errorLight: '#EF5350',
    errorDark: '#C62828',
    bgDefault: '#EEF4FA',
    bgPaper: '#FFFFFF',
    bgMuted: '#E3EDF7',
    textPrimary: '#1A2B3C',
    textSecondary: '#5C6F82',
    divider: alpha('#1A3A5C', 0.1),
  },
  dark: {
    primary: '#42A5F5',
    primaryLight: '#64B5F6',
    primaryDark: '#2196F3',
    button: '#1976D2',
    buttonHover: '#1E88E5',
    buttonActive: '#1565C0',
    secondary: '#FFB74D',
    secondaryLight: '#FFCC80',
    secondaryDark: '#FB8C00',
    success: '#66BB6A',
    successLight: '#81C784',
    successDark: '#43A047',
    warning: '#FFA726',
    warningLight: '#FFB74D',
    warningDark: '#F57C00',
    info: '#4DD0E1',
    infoLight: '#80DEEA',
    infoDark: '#00ACC1',
    error: '#F85149',
    errorLight: '#FF7B72',
    errorDark: '#DA3633',
    bgDefault: '#0F1623',
    bgPaper: '#1A2433',
    bgMuted: '#243044',
    textPrimary: '#E8EFF7',
    textSecondary: '#9AAFC3',
    divider: alpha('#C5D9EB', 0.12),
  },
} as const;

export type ThemeModeTokens = (typeof parkingTokens)['light'];
export type ThemeBrandOverrides = Partial<{
  primary: string;
  secondary: string;
  name: string;
}>;

export function resolveThemeTokens(mode: PaletteMode, brandOverrides?: ThemeBrandOverrides) {
  const base = mode === 'light' ? parkingTokens.light : parkingTokens.dark;

  if (!brandOverrides?.primary && !brandOverrides?.secondary) {
    return { ...base, brandName: brandOverrides?.name ?? brand.name };
  }

  return {
    ...base,
    brandName: brandOverrides?.name ?? brand.name,
    ...(brandOverrides?.primary
      ? {
          primary: brandOverrides.primary,
          button: brandOverrides.primary,
        }
      : {}),
    ...(brandOverrides?.secondary ? { secondary: brandOverrides.secondary } : {}),
  };
}