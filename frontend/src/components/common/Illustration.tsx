import { Box } from '@mui/material';
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
  return (
    <Box
      alt={alt}
      component="img"
      src={illustrations[name]}
      sx={{
        '--primary-svg-color': 'var(--illustration-accent, #1f6feb)',
        display: 'block',
        height: 'auto',
        maxWidth,
        mx: 'auto',
        width: '100%',
      }}
    />
  );
}