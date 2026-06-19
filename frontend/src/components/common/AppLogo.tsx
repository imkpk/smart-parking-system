import { Box, Typography } from '@mui/material';
import parkLogo from '../../assets/illustrations/at-the-park.svg?url';
import { brand } from '../../theme/tokens';

export function AppLogo({
  showText = true,
  name,
  logoUrl,
  emphasis = false,
}: {
  showText?: boolean;
  name?: string;
  logoUrl?: string | null;
  emphasis?: boolean;
}) {
  const displayName = name ?? brand.name;
  const logoSrc = logoUrl || parkLogo;
  const logoSize = emphasis ? 50 : showText ? 45 : 38;

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        gap: emphasis ? 1.5 : 1.25,
        minWidth: 0,
      }}
    >
      <Box
        alt={displayName}
        component="img"
        src={logoSrc}
        sx={{
          display: 'block',
          flexShrink: 0,
          height: logoSize,
          objectFit: 'contain',
          width: logoSize,
        }}
      />
      {showText ? (
        <Box minWidth={0}>
          <Typography
            component="span"
            noWrap
            sx={{ fontWeight: emphasis ? 700 : 600, lineHeight: 1.2 }}
            variant={emphasis ? 'h5' : 'h6'}
          >
            {displayName}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}