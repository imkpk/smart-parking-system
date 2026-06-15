import { Alert, Snackbar } from '@mui/material';
import { AppSnackbarState } from '../../hooks/useAppSnackbar';

export function AppSnackbar({
  onClose,
  snackbar,
}: {
  onClose: () => void;
  snackbar: AppSnackbarState;
}) {
  return (
    <Snackbar autoHideDuration={3500} onClose={onClose} open={Boolean(snackbar)}>
      <Alert onClose={onClose} severity={snackbar?.severity ?? 'success'} variant="filled">
        {snackbar?.message}
      </Alert>
    </Snackbar>
  );
}
