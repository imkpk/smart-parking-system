import { alpha, createTheme, PaletteMode } from '@mui/material';
import { createComponentOverrides } from './components';
import { resolveThemeTokens, shapeTokens, ThemeBrandOverrides, typographyTokens } from './tokens';

export function createAppTheme(mode: PaletteMode, brandOverrides?: ThemeBrandOverrides) {
  const isLight = mode === 'light';
  const tokens = resolveThemeTokens(mode, brandOverrides);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.primary,
        light: tokens.primaryLight,
        dark: tokens.primaryDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: tokens.secondary,
        light: tokens.secondaryLight,
        dark: tokens.secondaryDark,
        contrastText: isLight ? '#3E2723' : '#1A1208',
      },
      success: {
        main: tokens.success,
        light: tokens.successLight,
        dark: tokens.successDark,
        contrastText: '#ffffff',
      },
      warning: {
        main: tokens.warning,
        light: tokens.warningLight,
        dark: tokens.warningDark,
        contrastText: isLight ? '#3E2723' : '#1A1208',
      },
      info: {
        main: tokens.info,
        light: tokens.infoLight,
        dark: tokens.infoDark,
        contrastText: '#ffffff',
      },
      error: {
        main: tokens.error,
        light: tokens.errorLight,
        dark: tokens.errorDark,
        contrastText: '#ffffff',
      },
      background: {
        default: tokens.bgDefault,
        paper: tokens.bgPaper,
      },
      divider: tokens.divider,
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary,
      },
      action: {
        selected: alpha(tokens.primary, isLight ? 0.1 : 0.16),
        hover: alpha(tokens.primary, isLight ? 0.06 : 0.1),
      },
    },
    shape: {
      borderRadius: shapeTokens.borderRadius,
    },
    typography: typographyTokens,
    components: createComponentOverrides(mode, brandOverrides),
  });
}