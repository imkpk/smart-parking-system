import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Button } from '@mui/material';
import { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export function ViewAllActionButton({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Button
      color="inherit"
      component={RouterLink}
      endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
      size="small"
      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      to={to}
      variant="outlined"
    >
      {children}
    </Button>
  );
}