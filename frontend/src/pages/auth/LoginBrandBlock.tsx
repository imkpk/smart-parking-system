import { Box, Typography } from '@mui/material';
import parkLogo from '../../assets/illustrations/at-the-park.svg?url';
import { brand } from '../../theme/tokens';

export function LoginBrandBlock({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  const logoSrc = logoUrl || parkLogo;

  return (
    <Box sx={{ alignItems: 'flex-start', display: 'flex', gap: 1.5, minWidth: 0 }}>
      <Box
        alt={name}
        component="img"
        src={logoSrc}
        sx={{
          display: 'block',
          flexShrink: 0,
          height: 50,
          objectFit: 'contain',
          width: 50,
        }}
      />
      <Box minWidth={0}>
        <Typography
          component="span"
          noWrap
          sx={{ fontWeight: 700, lineHeight: 1.2 }}
          variant="h5"
        >
          {name}
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            letterSpacing: '0.06em',
            lineHeight: 1.3,
            mb: '10px',
            mt: '3px',
          }}
          variant="body2"
        >
          {brand.loginHero}
        </Typography>
      </Box>
    </Box>
  );
}