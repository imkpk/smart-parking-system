import { Box, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import type { IllustrationName } from '../../assets/illustrations';
import { Illustration } from './Illustration';

export function EmptyState({
  action,
  description,
  illustration,
  illustrationMaxWidth = 220,
  title,
}: {
  action?: ReactNode;
  description?: string;
  illustration?: IllustrationName;
  illustrationMaxWidth?: number;
  title: string;
}) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: 200,
        p: 3,
        width: '100%',
      }}
    >
      <Stack alignItems="center" maxWidth={420} spacing={1.5} textAlign="center">
        {illustration ? <Illustration maxWidth={illustrationMaxWidth} name={illustration} /> : null}
        <Typography variant="subtitle1">{title}</Typography>
        {description ? (
          <Typography color="text.secondary" variant="body2">
            {description}
          </Typography>
        ) : null}
        {action}
      </Stack>
    </Box>
  );
}