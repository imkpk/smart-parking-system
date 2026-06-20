import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { useId, useState } from 'react';
import { authTextFieldProps } from '../../pages/auth/authFieldProps';

export function PasswordField({
  autoComplete,
  id,
  label,
  onChange,
  required = false,
  value,
}: {
  autoComplete: 'current-password' | 'new-password';
  id?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...authTextFieldProps}
      autoComplete={autoComplete}
      id={fieldId}
      label={label}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      type={visible ? 'text' : 'password'}
      value={value}
      slotProps={{
        ...authTextFieldProps.slotProps,
        input: {
          inputProps: {
            'data-testid': fieldId,
          },
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? 'Hide password' : 'Show password'}
                edge="end"
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
        inputLabel: {
          ...authTextFieldProps.slotProps?.inputLabel,
          htmlFor: fieldId,
        },
      }}
    />
  );
}