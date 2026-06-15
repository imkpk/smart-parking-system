import { useState } from 'react';

export type AppSnackbarSeverity = 'success' | 'error' | 'warning';

export type AppSnackbarState = {
  message: string;
  severity: AppSnackbarSeverity;
} | null;

export function useAppSnackbar() {
  const [snackbar, setSnackbar] = useState<AppSnackbarState>(null);

  return {
    snackbar,
    closeSnackbar: () => setSnackbar(null),
    showError: (message: string) => setSnackbar({ message, severity: 'error' }),
    showSuccess: (message: string) => setSnackbar({ message, severity: 'success' }),
    showWarning: (message: string) => setSnackbar({ message, severity: 'warning' }),
  };
}
