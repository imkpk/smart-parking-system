import { alpha, PaletteMode } from '@mui/material';
import { motionTokens, resolveThemeTokens, shapeTokens, ThemeBrandOverrides } from './tokens';

export function createComponentOverrides(mode: PaletteMode, brandOverrides?: ThemeBrandOverrides) {
  const isLight = mode === 'light';
  const tokens = resolveThemeTokens(mode, brandOverrides);
  const primaryMain = tokens.primary;
  const buttonMain = tokens.button;
  const buttonHover = tokens.buttonHover;
  const buttonActive = tokens.buttonActive;
  const secondaryMain = tokens.secondary;
  const secondaryHover = isLight ? '#FBC02D' : tokens.secondaryLight;
  const errorMain = tokens.error;
  const errorHover = isLight ? '#E53935' : tokens.errorLight;
  const surfaceHover = alpha(tokens.textPrimary, isLight ? 0.06 : 0.08);
  const outlinedBorder = alpha(tokens.textPrimary, isLight ? 0.14 : 0.18);
  const focusRing = alpha(primaryMain, isLight ? 0.28 : 0.34);
  const transition = `background-color ${motionTokens.normal} ${motionTokens.easing}, border-color ${motionTokens.normal} ${motionTokens.easing}, color ${motionTokens.normal} ${motionTokens.easing}, box-shadow ${motionTokens.normal} ${motionTokens.easing}, transform ${motionTokens.fast} ${motionTokens.easing}`;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.bgDefault,
          textRendering: 'geometricPrecision',
        },
        ':root': {
          colorScheme: 'light dark',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: isLight
            ? `linear-gradient(90deg, ${alpha(tokens.primary, 0.04)} 0%, transparent 55%)`
            : `linear-gradient(90deg, ${alpha(tokens.primary, 0.1)} 0%, transparent 55%)`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.bgPaper,
          backgroundImage: isLight
            ? `linear-gradient(180deg, ${alpha(tokens.primary, 0.07)} 0%, transparent 180px), linear-gradient(90deg, ${alpha(tokens.secondary, 0.05)} 0%, transparent 40%)`
            : `linear-gradient(180deg, ${alpha(tokens.primary, 0.12)} 0%, transparent 180px), linear-gradient(90deg, ${alpha(tokens.secondary, 0.06)} 0%, transparent 40%)`,
          borderRight: '1px solid',
          borderColor: tokens.divider,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: shapeTokens.cardRadius,
          transition,
        },
        outlined: {
          borderColor: alpha(tokens.primary, isLight ? 0.12 : 0.18),
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: tokens.primary,
          borderRadius: 2,
          height: 3,
          transition: `transform ${motionTokens.normal} ${motionTokens.easing}, width ${motionTokens.normal} ${motionTokens.easing}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          transition,
          '&.Mui-selected': {
            color: tokens.primary,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          transition,
          '&.Mui-selected': {
            backgroundColor: alpha(tokens.primary, isLight ? 0.1 : 0.16),
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: shapeTokens.buttonRadius,
          gap: 8,
          lineHeight: 1.4,
          minHeight: 40,
          padding: '9px 18px',
          transition,
          '&:focus-visible': {
            boxShadow: `0 0 0 3px ${focusRing}`,
            outline: 'none',
          },
          '&:active:not(:disabled)': {
            transform: 'translateY(1px)',
          },
        },
        sizeSmall: {
          borderRadius: shapeTokens.buttonRadiusSmall,
          minHeight: 34,
          padding: '6px 12px',
        },
        sizeLarge: {
          borderRadius: shapeTokens.buttonRadiusLarge,
          fontSize: '0.95rem',
          minHeight: 48,
          padding: '12px 22px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha(buttonMain, isLight ? 0.28 : 0.4)}`,
          },
          '&:active': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: buttonMain,
          boxShadow: isLight
            ? 'none'
            : `0 1px 0 ${alpha('#ffffff', 0.14)} inset, 0 1px 2px ${alpha('#000000', 0.3)}`,
          color: '#ffffff',
          backgroundImage: isLight
            ? `linear-gradient(180deg, ${alpha('#ffffff', 0.16)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${buttonHover} 0%, ${buttonMain} 100%)`
            : `linear-gradient(180deg, ${alpha('#ffffff', 0.14)} 0%, transparent 45%), linear-gradient(180deg, ${buttonHover} 0%, ${buttonActive} 100%)`,
          '&:hover': {
            backgroundColor: buttonHover,
            backgroundImage: isLight
              ? `linear-gradient(180deg, ${alpha('#ffffff', 0.18)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${buttonHover} 0%, ${buttonActive} 100%)`
              : `linear-gradient(180deg, ${alpha('#ffffff', 0.18)} 0%, transparent 45%), linear-gradient(180deg, ${tokens.primaryLight} 0%, ${buttonMain} 100%)`,
            boxShadow: isLight
              ? `0 6px 20px ${alpha(buttonMain, 0.28)}`
              : `0 1px 0 ${alpha('#ffffff', 0.16)} inset, 0 8px 24px ${alpha(buttonMain, 0.5)}`,
          },
          '&:disabled': {
            backgroundColor: alpha(buttonMain, isLight ? 0.45 : 0.32),
            backgroundImage: 'none',
            boxShadow: 'none',
            color: alpha('#ffffff', isLight ? 0.7 : 0.5),
          },
        },
        containedSecondary: {
          backgroundColor: secondaryMain,
          backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.2)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${secondaryHover} 0%, ${secondaryMain} 100%)`,
          color: isLight ? '#3E2723' : '#1A1208',
          '&:hover': {
            backgroundColor: secondaryHover,
            boxShadow: `0 6px 20px ${alpha(secondaryMain, 0.32)}`,
          },
        },
        containedError: {
          backgroundColor: errorMain,
          backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.12)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${errorHover} 0%, ${errorMain} 100%)`,
          '&:hover': {
            backgroundColor: errorHover,
            boxShadow: `0 6px 20px ${alpha(errorMain, 0.28)}`,
          },
        },
        outlined: {
          borderColor: outlinedBorder,
          borderWidth: '1.5px',
          '&:hover': {
            backgroundColor: alpha(primaryMain, isLight ? 0.06 : 0.1),
            borderColor: alpha(primaryMain, isLight ? 0.35 : 0.42),
            borderWidth: '1.5px',
          },
        },
        outlinedInherit: {
          borderColor: outlinedBorder,
          color: tokens.textSecondary,
          '&:hover': {
            backgroundColor: surfaceHover,
            borderColor: alpha(tokens.textPrimary, isLight ? 0.22 : 0.28),
            borderWidth: '1.5px',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: surfaceHover,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: shapeTokens.buttonRadius,
          transition,
          '&:hover': {
            backgroundColor: alpha(primaryMain, isLight ? 0.08 : 0.12),
          },
          '&:focus-visible': {
            boxShadow: `0 0 0 3px ${focusRing}`,
            outline: 'none',
          },
        },
        sizeSmall: {
          borderRadius: shapeTokens.buttonRadiusSmall,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          gap: 8,
          padding: '16px 24px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: shapeTokens.cardRadius,
          transition,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          transition,
        },
        colorPrimary: {
          backgroundColor: alpha(tokens.primary, isLight ? 0.12 : 0.18),
          border: '1px solid',
          borderColor: alpha(tokens.primary, isLight ? 0.28 : 0.36),
          color: tokens.primaryDark,
        },
        colorSuccess: {
          backgroundColor: alpha(tokens.success, isLight ? 0.12 : 0.18),
          border: '1px solid',
          borderColor: alpha(tokens.success, 0.4),
          color: tokens.successDark,
        },
        colorWarning: {
          backgroundColor: alpha(tokens.warning, isLight ? 0.14 : 0.18),
          border: '1px solid',
          borderColor: alpha(tokens.warning, 0.4),
          color: tokens.warningDark,
        },
      },
    },
  };
}