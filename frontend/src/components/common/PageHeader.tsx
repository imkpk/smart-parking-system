import { Box, Button, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      spacing={2}
    >
      <Box>
        <Typography variant="h4">{title}</Typography>
        {description ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box>{action}</Box> : null}
    </Stack>
  );
}

export function HeaderActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} variant="contained">
      {children}
    </Button>
  );
}
