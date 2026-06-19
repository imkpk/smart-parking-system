import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import type { IllustrationName } from '../../assets/illustrations';
import { Illustration } from '../../components/common/Illustration';
import { ThemeModeToggle } from '../../components/common/ThemeModeToggle';
import { DEFAULT_LOGIN_TITLE } from '../../constants/defaultBranding';
import { useTenantBranding } from '../../providers/TenantBrandingProvider';
import { brand } from '../../theme/tokens';
import { LoginBrandBlock } from './LoginBrandBlock';

export function AuthPageShell({
  title,
  subtitle,
  mobileSubtitle,
  illustration = 'secureLogin',
  children,
}: {
  title: string;
  subtitle?: string;
  mobileSubtitle?: string;
  illustration?: IllustrationName;
  children: ReactNode;
}) {
  const { branding, error, isLoading } = useTenantBranding();
  const pageTitle =
    branding.loginTitle && branding.loginTitle !== DEFAULT_LOGIN_TITLE
      ? branding.loginTitle
      : title;
  const desktopSubtitle = subtitle ?? brand.tagline;
  const compactSubtitle = mobileSubtitle ?? brand.mobileTagline;

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
          sx={{ display: { xs: 'none', md: 'flex' }, px: 2, py: 1 }}
        >
          <Illustration maxWidth={300} name={illustration} />
        </Stack>

        <Paper
          elevation={0}
          sx={{
            alignSelf: 'center',
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 3, sm: 4 },
            width: '100%',
          }}
        >
          <Stack spacing={3}>
            <Stack alignItems="flex-start" spacing={1.5}>
              <LoginBrandBlock logoUrl={branding.logoUrl} name={branding.name} />
              <Box>
                <Typography component="h1" variant="h5">
                  {isLoading ? title : pageTitle}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ display: { xs: 'none', md: 'block' }, mt: 0.5 }}
                  variant="body2"
                >
                  {desktopSubtitle}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ display: { xs: 'block', md: 'none' }, mt: 0.5 }}
                  variant="body2"
                >
                  {compactSubtitle}
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