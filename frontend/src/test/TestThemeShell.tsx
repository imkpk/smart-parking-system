import { CssBaseline, ThemeProvider } from '@mui/material';
import { ReactNode, useMemo } from 'react';
import { useThemeMode } from '../providers/ThemeModeProvider';
import { createAppTheme } from '../theme';

/** Test-only MUI theme shell when AuthProvider/TenantBrandingProvider are mocked. */
export function TestThemeShell({ children }: { children: ReactNode }) {
  const { mode } = useThemeMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}