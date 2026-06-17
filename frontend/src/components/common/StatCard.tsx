import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon,
  accentColor = 'primary.main',
  compact = false,
  iconBgcolor = 'rgba(31, 111, 235, 0.1)',
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  accentColor?: string;
  compact?: boolean;
  iconBgcolor?: string;
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
          borderColor: accentColor,
          boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <CardContent
        sx={{
          p: compact ? { xs: 1.5, sm: 1.75 } : { xs: 2, sm: 2.5 },
          '&:last-child': {
            pb: compact ? { xs: 1.5, sm: 1.75 } : { xs: 2, sm: 2.5 },
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Stack spacing={compact ? 0.5 : 1}>
            <Typography color="text.secondary" fontWeight={600} variant="body2">
              {label}
            </Typography>
            <Typography
              sx={{
                fontSize: compact
                  ? { xs: '1.25rem', sm: '1.375rem' }
                  : { xs: '1.375rem', sm: '1.5rem' },
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
              variant="h5"
            >
              {value}
            </Typography>
          </Stack>
          {icon ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                bgcolor: iconBgcolor,
                borderRadius: 1.5,
                color: accentColor,
                height: compact ? 36 : 44,
                width: compact ? 36 : 44,
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
