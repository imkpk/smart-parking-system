import { Box, useTheme } from '@mui/material';
import {
  illustrations,
  type IllustrationName,
} from '../../assets/illustrations';

export function Illustration({
  alt = '',
  maxWidth = 280,
  name,
}: {
  alt?: string;
  maxWidth?: number | string;
  name: IllustrationName;
}) {
  const theme = useTheme();

  return (
    <Box
      alt={alt || `${name} illustration`}
      component="img"
      src={illustrations[name]}
      sx={{
        '--primary-svg-color': theme.palette.primary.main,
        display: 'block',
        height: 'auto',
        maxWidth,
        mx: 'auto',
        width: '100%',
      }}
    />
  );
}