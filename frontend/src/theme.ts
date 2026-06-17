import { alpha, createTheme, PaletteMode } from '@mui/material';

const sharedTypography = {
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
};

function createComponentOverrides(mode: PaletteMode) {
  const isLight = mode === 'light';
  const primaryMain = isLight ? '#1f6feb' : '#58a6ff';
  const primaryHover = isLight ? '#256ef0' : '#6cb6ff';
  const primaryActive = isLight ? '#1558c0' : '#4493e6';
  const errorMain = isLight ? '#cf222e' : '#f85149';
  const errorHover = isLight ? '#d73a49' : '#ff7b72';
  const surfaceHover = isLight ? alpha('#0f172a', 0.06) : alpha('#f0f6fc', 0.08);
  const outlinedBorder = isLight ? alpha('#0f172a', 0.14) : alpha('#f0f6fc', 0.18);
  const focusRing = alpha(primaryMain, isLight ? 0.28 : 0.34);

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          textRendering: 'geometricPrecision',
        },
        ':root': {
          colorScheme: 'light dark',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          gap: 8,
          lineHeight: 1.4,
          minHeight: 40,
          padding: '9px 18px',
          transition:
            'background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 120ms ease',
          '&:focus-visible': {
            boxShadow: `0 0 0 3px ${focusRing}`,
            outline: 'none',
          },
          '&:active:not(:disabled)': {
            transform: 'translateY(1px)',
          },
        },
        sizeSmall: {
          borderRadius: 8,
          minHeight: 34,
          padding: '6px 12px',
        },
        sizeLarge: {
          borderRadius: 12,
          fontSize: '0.95rem',
          minHeight: 48,
          padding: '12px 22px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: isLight
              ? `0 6px 20px ${alpha(primaryMain, 0.28)}`
              : `0 6px 20px ${alpha(primaryMain, 0.24)}`,
          },
          '&:active': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: primaryMain,
          backgroundImage: isLight
            ? `linear-gradient(180deg, ${alpha('#ffffff', 0.14)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${primaryHover} 0%, ${primaryMain} 100%)`
            : `linear-gradient(180deg, ${alpha('#ffffff', 0.12)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${primaryHover} 0%, ${primaryMain} 100%)`,
          '&:hover': {
            backgroundColor: primaryHover,
            backgroundImage: isLight
              ? `linear-gradient(180deg, ${alpha('#ffffff', 0.16)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${primaryHover} 0%, ${primaryActive} 100%)`
              : `linear-gradient(180deg, ${alpha('#ffffff', 0.14)} 0%, ${alpha('#000000', 0)} 100%), linear-gradient(180deg, ${primaryHover} 0%, ${primaryActive} 100%)`,
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
          color: isLight ? '#334155' : '#c9d1d9',
          '&:hover': {
            backgroundColor: surfaceHover,
            borderColor: isLight ? alpha('#0f172a', 0.22) : alpha('#f0f6fc', 0.28),
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
          borderRadius: 10,
          transition: 'background-color 160ms ease, color 160ms ease, box-shadow 160ms ease',
          '&:hover': {
            backgroundColor: surfaceHover,
          },
          '&:focus-visible': {
            boxShadow: `0 0 0 3px ${focusRing}`,
            outline: 'none',
          },
        },
        sizeSmall: {
          borderRadius: 8,
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
          borderRadius: 12,
        },
      },
    },
  };
}

export function createAppTheme(mode: PaletteMode) {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? '#1f6feb' : '#58a6ff',
        light: isLight ? '#58a6ff' : '#79c0ff',
        dark: isLight ? '#1558c0' : '#4493e6',
        contrastText: '#ffffff',
      },
      secondary: {
        main: isLight ? '#0f766e' : '#2dd4bf',
        contrastText: '#ffffff',
      },
      error: {
        main: isLight ? '#cf222e' : '#f85149',
        contrastText: '#ffffff',
      },
      background: {
        default: isLight ? '#f6f8fb' : '#0d1117',
        paper: isLight ? '#ffffff' : '#161b22',
      },
      divider: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(240, 246, 252, 0.12)',
      text: {
        primary: isLight ? '#0f172a' : '#e6edf3',
        secondary: isLight ? '#64748b' : '#8b949e',
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: sharedTypography,
    components: createComponentOverrides(mode),
  });
}

/** @deprecated Use createAppTheme via ThemeModeProvider */
export const theme = createAppTheme('light');