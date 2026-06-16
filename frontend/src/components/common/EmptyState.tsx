import { Box, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
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
        <Typography fontWeight={700} variant="h6">
          {title}
        </Typography>
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