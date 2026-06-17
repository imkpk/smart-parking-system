import { Box, Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { brandAssets } from '../../assets/brand';
import { ThemeModeToggle } from '../../components/common/ThemeModeToggle';

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
          spacing={2.5}
          sx={{ display: { xs: 'none', md: 'flex' }, px: 1 }}
        >
          <Box
            alt="Smart Parking admin dashboard preview"
            component="img"
            src={brandAssets.authHeroDashboard}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 12px 40px rgba(0, 0, 0, 0.45)'
                  : '0 12px 32px rgba(21, 101, 192, 0.12)',
              display: 'block',
              height: 'auto',
              maxWidth: 400,
              width: '100%',
            }}
          />
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