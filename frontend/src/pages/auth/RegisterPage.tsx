import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { getRoleHomePath } from '../../lib/routes';
import { useAuth } from '../../providers/AuthProvider';
import { Role } from '../../types/auth';
import { AuthPageShell } from './AuthPageShell';

export function RegisterPage() {
  const { isAuthenticated, register, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER');
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
      const response = await register({
        name,
        email,
        phone: phone || undefined,
        password,
        role,
      });
      navigate(getRoleHomePath(response.user.role), { replace: true });
    } catch {
      setError('Could not register this account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell title="Create account" subtitle="Register a Smart Parking user.">
      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField
          label="Name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <TextField
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          label="Phone"
          onChange={(event) => setPhone(event.target.value)}
          value={phone}
        />
        <TextField
          autoComplete="new-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <FormControl>
          <InputLabel id="role-label">Role</InputLabel>
          <Select
            label="Role"
            labelId="role-label"
            onChange={(event) => setRole(event.target.value as Role)}
            value={role}
          >
            <MenuItem value="USER">User</MenuItem>
            <MenuItem value="SECURITY">Security</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
          </Select>
        </FormControl>
        <Button disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained">
          Create account
        </Button>
        <Link component={RouterLink} to="/login" underline="hover">
          Already have an account?
        </Link>
      </Stack>
    </AuthPageShell>
  );
}
