import type { FormControlProps, InputLabelProps, TextFieldProps } from '@mui/material';

const authInputLabelSx = {
  backgroundColor: 'background.paper',
  px: 0.75,
  color: 'text.secondary',
  '&.Mui-focused': {
    color: 'primary.main',
  },
} as const;

export const authTextFieldProps: Pick<TextFieldProps, 'fullWidth' | 'variant' | 'slotProps' | 'sx'> = {
  fullWidth: true,
  variant: 'outlined',
  slotProps: {
    inputLabel: {
      shrink: true,
      sx: authInputLabelSx,
    },
  },
  sx: {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'background.paper',
    },
    '& .MuiOutlinedInput-notchedOutline legend': {
      maxWidth: '100%',
    },
  },
};

export const authFormControlProps: Pick<FormControlProps, 'fullWidth' | 'variant' | 'sx'> = {
  fullWidth: true,
  variant: 'outlined',
  sx: {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'background.paper',
    },
    '& .MuiOutlinedInput-notchedOutline legend': {
      maxWidth: '100%',
    },
  },
};

export const authInputLabelProps: Pick<InputLabelProps, 'shrink' | 'sx'> = {
  shrink: true,
  sx: authInputLabelSx,
};