import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { forgotPassword } from '../../api/authApi';
import { getApiErrorMessage } from '../../lib/apiError';
import { authTextFieldProps } from './authFieldProps';
import { AuthPageShell } from './AuthPageShell';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const response = await forgotPassword(email.trim());
      setSuccessMessage(
        response.message ??
          "If this email is registered, you'll receive a reset link shortly.",
      );
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Could not send reset link. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell title="Forgot password">
      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        <Typography color="text.secondary" variant="body2">
          Enter your account email and we&apos;ll send you a reset link.
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
        <TextField
          {...authTextFieldProps}
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <Button disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained">
          Send Reset Link
        </Button>
        <Link component={RouterLink} to="/login" underline="hover">
          Back to Login
        </Link>
      </Stack>
    </AuthPageShell>
  );
}