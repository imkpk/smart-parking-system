import { Alert, Button, Link, Stack, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/authApi';
import { PasswordField } from '../../components/auth/PasswordField';
import { getApiErrorMessage } from '../../lib/apiError';
import { AuthPageShell } from './AuthPageShell';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({ token, newPassword });
      setSuccessMessage(response.message ?? 'Password reset successfully!');
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (submitError) {
      setError(
        getApiErrorMessage(
          submitError,
          'This reset link is invalid or has expired.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthPageShell title="Reset password">
        <Stack spacing={2}>
          <Alert severity="error">Invalid reset link. Please request a new one.</Alert>
          <Link component={RouterLink} to="/forgot-password" underline="hover">
            Request a new reset link
          </Link>
        </Stack>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell title="Reset password">
      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
        <PasswordField
          autoComplete="new-password"
          id="reset-password"
          label="New Password"
          onChange={setNewPassword}
          required
          value={newPassword}
        />
        <PasswordField
          autoComplete="new-password"
          id="reset-password-confirm"
          label="Confirm Password"
          onChange={setConfirmPassword}
          required
          value={confirmPassword}
        />
        <Button disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained">
          Reset Password
        </Button>
        <Typography color="text.secondary" variant="body2">
          Link expired?{' '}
          <Link component={RouterLink} to="/forgot-password" underline="hover">
            Request a new one
          </Link>
        </Typography>
      </Stack>
    </AuthPageShell>
  );
}