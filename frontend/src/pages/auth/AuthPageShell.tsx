import { Box, Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import type { IllustrationName } from '../../assets/illustrations';
import { Illustration } from '../../components/common/Illustration';
import { ThemeModeToggle } from '../../components/common/ThemeModeToggle';

export function AuthPageShell({
  title,
  subtitle,
  illustration = 'secureLogin',
  children,
}: {
  title: string;
  subtitle: string;
  illustration?: IllustrationName;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'background.default',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        px: 2,
        py: 4,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', right: 16, top: 16 }}>
        <ThemeModeToggle />
      </Box>

      <Box
        sx={{
          alignItems: 'stretch',
          display: 'grid',
          gap: 4,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 1fr) minmax(360px, 440px)' },
          maxWidth: 960,
          width: '100%',
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={2}
          sx={{ display: { xs: 'none', md: 'flex' }, px: 2 }}
        >
          <Illustration maxWidth={360} name={illustration} />
          <Typography color="text.secondary" textAlign="center" variant="body1">
            Manage parking lots, bookings, check-ins, and payments from one workspace.
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 3, sm: 4 },
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
    </Box>
  );
}