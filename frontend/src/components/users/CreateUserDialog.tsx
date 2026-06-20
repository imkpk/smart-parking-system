import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { createUser } from '../../api/usersApi';
import { AppSnackbar } from '../common/AppSnackbar';
import { PasswordField } from '../auth/PasswordField';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatRole } from '../../lib/formatRole';
import { toApiIndianPhone } from '../../lib/phone';
import { Role } from '../../types/auth';

const creatableRoles: Record<'TENANT_ADMIN' | 'ADMIN', Role[]> = {
  TENANT_ADMIN: ['USER', 'ADMIN', 'SECURITY'],
  ADMIN: ['USER', 'SECURITY'],
};

export function CreateUserDialog({
  onClose,
  open,
  presetRole,
}: {
  onClose: () => void;
  open: boolean;
  presetRole: Role;
}) {
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const { isTenantAdmin, user } = useUserRole();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(presetRole);

  const allowedRoles =
    user?.role === 'TENANT_ADMIN' || isTenantAdmin
      ? creatableRoles.TENANT_ADMIN
      : creatableRoles.ADMIN;

  useEffect(() => {
    if (!open) {
      return;
    }

    setRole(allowedRoles.includes(presetRole) ? presetRole : allowedRoles[0]);
  }, [allowedRoles, open, presetRole]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhoneDigits('');
    setPassword('');
    setRole(allowedRoles[0]);
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['users', 'summary'] });
      showSuccess('User created.');
      resetForm();
      onClose();
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, 'Could not create user.'));
    },
  });

  const handleClose = () => {
    if (createMutation.isPending) {
      return;
    }

    resetForm();
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = toApiIndianPhone(phoneDigits);
    if (!normalizedPhone) {
      showError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: normalizedPhone,
      password,
      role,
    });
  };

  return (
    <>
      <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={open}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Create {formatRole(role)}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
              <TextField
                label="Email (optional)"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
              <TextField
                InputProps={{
                  startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                }}
                inputProps={{ inputMode: 'numeric', maxLength: 10 }}
                label="Mobile number"
                onChange={(event) =>
                  setPhoneDigits(event.target.value.replace(/\D/g, '').slice(0, 10))
                }
                required
                value={phoneDigits}
              />
              <PasswordField
                autoComplete="new-password"
                id="create-user-password"
                label="Password"
                onChange={setPassword}
                required
                value={password}
              />
              <FormControl required>
                <InputLabel id="create-user-role-label">Role</InputLabel>
                <Select
                  label="Role"
                  labelId="create-user-role-label"
                  onChange={(event) => setRole(event.target.value as Role)}
                  value={role}
                >
                  {allowedRoles.map((allowedRole) => (
                    <MenuItem key={allowedRole} value={allowedRole}>
                      {formatRole(allowedRole)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={createMutation.isPending} onClick={handleClose}>
              Cancel
            </Button>
            <Button disabled={createMutation.isPending} type="submit" variant="contained">
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </>
  );
}