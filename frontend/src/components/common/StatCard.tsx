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
    <Card
      elevation={0}
      sx={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        marginLeft: 0, marginRight: 2,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Stack spacing={1}>
            <Typography color="text.secondary" fontWeight={600} variant="body2">
              {label}
            </Typography>
            <Typography sx={{ fontSize: { xs: '2rem', sm: '2.25rem' }, lineHeight: 1 }} variant="h4">
              {value}
            </Typography>
          </Stack>
          {icon ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                bgcolor: 'rgba(31, 111, 235, 0.1)',
                borderRadius: 1.5,
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
