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
      alignItems="flex-start"
      direction="row"
      justifyContent="space-between"
      spacing={2}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
            lineHeight: 1.15,
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.95rem', sm: '1rem' },
              lineHeight: 1.45,
              mt: 1,
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? (
        <Box sx={{ flexShrink: 0, pt: { xs: 0.25, sm: 0 } }}>
          {action}
        </Box>
      ) : null}
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
