import {
  Alert,
  Button,
  Link,
  Stack,
  TextField,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useTenantSlugFromRoute } from '../../hooks/useTenantSlugFromRoute';
import { getRoleHomePath } from '../../lib/routes';
import { useAuth } from '../../providers/AuthProvider';
import { brand } from '../../theme/tokens';
import { authTextFieldProps } from './authFieldProps';
import { AuthPageShell } from './AuthPageShell';

export function LoginPage() {
  useTenantSlugFromRoute();
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await login({ email, password });
      navigate(getRoleHomePath(response.user.role), { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell title={brand.loginHero}>
      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField
          {...authTextFieldProps}
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          {...authTextFieldProps}
          autoComplete="current-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <Button disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained">
          Sign in
        </Button>
        <Link component={RouterLink} to="/register" underline="hover">
          Create an account
        </Link>
      </Stack>
    </AuthPageShell>
  );
}
