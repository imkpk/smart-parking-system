import { Box, Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function AuthPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          maxWidth: 440,
          p: 4,
          width: '100%',
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4">{title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          </Box>
          {children}
        </Stack>
      </Paper>
    </Box>
  );
}
