import { Clear, Search } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { ChangeEvent } from 'react';

export function SearchField({
  disabled = false,
  fullWidth = true,
  label,
  onChange,
  onClear,
  placeholder,
  showSearchIcon = true,
  size = 'small',
  value,
}: {
  disabled?: boolean;
  fullWidth?: boolean;
  label?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  showSearchIcon?: boolean;
  size?: 'small' | 'medium';
  value: string;
}) {
  return (
    <TextField
      disabled={disabled}
      fullWidth={fullWidth}
      label={label}
      onChange={onChange}
      placeholder={placeholder}
      size={size}
      type="text"
      value={value}
      InputProps={{
        startAdornment: showSearchIcon ? (
          <InputAdornment position="start">
            <Search fontSize="small" />
          </InputAdornment>
        ) : undefined,
        endAdornment:
          onClear && value ? (
            <InputAdornment position="end">
              <IconButton aria-label="Clear search" edge="end" onClick={onClear} size="small">
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
      }}
    />
  );
}