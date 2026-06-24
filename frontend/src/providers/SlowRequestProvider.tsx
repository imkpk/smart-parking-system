import { ReactNode, useEffect } from 'react';
import { AppSnackbar } from '../components/common/AppSnackbar';
import { useAppSnackbar } from '../hooks/useAppSnackbar';
import { SLOW_REQUEST_EVENT, SLOW_REQUEST_MESSAGE } from '../lib/slowRequestWarning';

export function SlowRequestProvider({ children }: { children: ReactNode }) {
  const { closeSnackbar, showWarning, snackbar } = useAppSnackbar();

  useEffect(() => {
    const handleSlowRequest = () => {
      showWarning(SLOW_REQUEST_MESSAGE);
    };

    window.addEventListener(SLOW_REQUEST_EVENT, handleSlowRequest);

    return () => {
      window.removeEventListener(SLOW_REQUEST_EVENT, handleSlowRequest);
    };
  }, [showWarning]);

  return (
    <>
      {children}
      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </>
  );
}