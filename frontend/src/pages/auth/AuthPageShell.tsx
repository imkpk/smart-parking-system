import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import type { IllustrationName } from '../../assets/illustrations';
import { Illustration } from '../../components/common/Illustration';
import { ThemeModeToggle } from '../../components/common/ThemeModeToggle';
import { AppLogo } from '../../components/common/AppLogo';
import { DEFAULT_LOGIN_TITLE } from '../../constants/defaultBranding';
import { useTenantBranding } from '../../providers/TenantBrandingProvider';
import { brand } from '../../theme/tokens';

export function AuthPageShell({
  title,
  subtitle,
  illustration = 'secureLogin',
  children,
}: {
  title: string;
  subtitle?: string;
  illustration?: IllustrationName;
  children: ReactNode;
}) {
  const { branding, error, isLoading } = useTenantBranding();
  const pageTitle =
    branding.loginTitle && branding.loginTitle !== DEFAULT_LOGIN_TITLE
      ? branding.loginTitle
      : title;
  const pageSubtitle = subtitle ?? brand.tagline;

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
          <Illustration maxWidth={300} name={illustration} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography component="h2" sx={{ fontWeight: 600, lineHeight: 1.2 }} variant="h4">
              {branding.name}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
              {brand.loginHero}
            </Typography>
          </Box>
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
            <Stack alignItems="flex-start" spacing={1.5}>
              <AppLogo logoUrl={branding.logoUrl} name={branding.name} />
              <Box>
                <Typography component="h1" variant="h5">
                  {isLoading ? title : pageTitle}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                  {pageSubtitle}
                </Typography>
              </Box>
            </Stack>
            {error ? <Alert severity="warning">{error}</Alert> : null}
            {children}
            {branding.supportEmail ? (
              <Typography color="text.secondary" variant="caption">
                Need help? Contact {branding.supportEmail}
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}