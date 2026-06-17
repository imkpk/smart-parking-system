import { Box, Typography } from '@mui/material';
import parkLogo from '../../assets/illustrations/at-the-park.svg?url';
import { brand } from '../../theme/tokens';

export function AppLogo({ showText = true }: { showText?: boolean }) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        gap: 1.25,
        minWidth: 0,
      }}
    >
      <Box
        alt={brand.name}
        component="img"
        src={parkLogo}
        sx={{
          display: 'block',
          flexShrink: 0,
          height: showText ? 40 : 36,
          objectFit: 'contain',
          width: showText ? 40 : 36,
        }}
      />
      {showText ? (
        <Box minWidth={0}>
          <Typography fontWeight={700} noWrap variant="subtitle1">
            {brand.name}
          </Typography>
          <Typography color="text.secondary" noWrap variant="caption">
            {brand.tagline}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}