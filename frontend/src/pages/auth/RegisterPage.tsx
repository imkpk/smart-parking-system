import {
  Alert,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { PasswordField } from '../../components/auth/PasswordField';
import { isValidIndianPhoneDigits, normalizeIndianPhone } from '../../lib/phone';
import { getRoleHomePath } from '../../lib/routes';
import { useAuth } from '../../providers/AuthProvider';
import { OrganizationType } from '../../types/auth';
import { authFormControlProps, authInputLabelProps, authTextFieldProps } from './authFieldProps';
import { AuthPageShell } from './AuthPageShell';

const organizationTypes: { value: OrganizationType; label: string }[] = [
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'MALL', label: 'Mall' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'PUBLIC', label: 'Public parking' },
];

export function RegisterPage() {
  const { isAuthenticated, register, user } = useAuth();
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState<OrganizationType>('APARTMENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (phoneDigits && !isValidIndianPhoneDigits(phoneDigits)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    const normalizedPhone = phoneDigits ? normalizeIndianPhone(phoneDigits) : undefined;

    if (phoneDigits && !normalizedPhone) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        organizationName,
        organizationType,
        name,
        email,
        phone: normalizedPhone ?? undefined,
        password,
      });
      navigate(getRoleHomePath(response.user.role), { replace: true });
    } catch {
      setError('Could not register this account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell illustration="orderCar" title="Create your organization">
      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField
          {...authTextFieldProps}
          label="Organization name"
          onChange={(event) => setOrganizationName(event.target.value)}
          required
          value={organizationName}
        />
        <FormControl {...authFormControlProps} required>
          <InputLabel id="organization-type-label" {...authInputLabelProps}>
            Organization type
          </InputLabel>
          <Select
            label="Organization type"
            labelId="organization-type-label"
            onChange={(event) => setOrganizationType(event.target.value as OrganizationType)}
            value={organizationType}
          >
            {organizationTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          {...authTextFieldProps}
          label="Full name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
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
          inputProps={{ inputMode: 'numeric', maxLength: 10, pattern: '[6-9][0-9]{9}' }}
          label="Phone"
          onChange={(event) =>
            setPhoneDigits(event.target.value.replace(/\D/g, '').slice(0, 10))
          }
          value={phoneDigits}
          InputProps={{
            startAdornment: <InputAdornment position="start">+91</InputAdornment>,
          }}
        />
        <PasswordField
          autoComplete="new-password"
          id="register-password"
          label="Password"
          onChange={setPassword}
          required
          value={password}
        />
        <Button disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained">
          Create organization account
        </Button>
        <Link component={RouterLink} to="/login" underline="hover">
          Already have an account?
        </Link>
      </Stack>
    </AuthPageShell>
  );
}