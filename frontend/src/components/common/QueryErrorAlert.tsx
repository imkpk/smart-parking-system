import { Alert } from '@mui/material';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';

export function QueryErrorAlert({
  error,
  fallbackMessage,
}: {
  error: unknown;
  fallbackMessage: string;
}) {
  if (!error) {
    return null;
  }

  if (isForbiddenError(error)) {
    return <Alert severity="warning">Access denied.</Alert>;
  }

  return <Alert severity="error">{getApiErrorMessage(error, fallbackMessage)}</Alert>;
}
