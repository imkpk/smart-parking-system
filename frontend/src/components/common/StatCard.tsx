import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
}) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Stack spacing={1}>
            <Typography color="text.secondary" variant="body2">
              {label}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Stack>
          {icon ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                bgcolor: 'primary.50',
                color: 'primary.main',
                height: 44,
                width: 44,
              }}
            >
              {icon}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
