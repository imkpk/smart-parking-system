import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  helperText,
  icon,
  accentColor = 'primary.main',
  compact = false,
  iconBgcolor = 'rgba(31, 111, 235, 0.1)',
}: {
  label: string;
  value: number | string;
  helperText?: string;
  icon?: ReactNode;
  accentColor?: string;
  compact?: boolean;
  iconBgcolor?: string;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: '100%',
        minWidth: 0,
        width: '100%',
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
          <Stack flex={1} minWidth={0} spacing={compact ? 0.75 : 1}>
            <Typography
              color="text.secondary"
              fontWeight={600}
              sx={{ letterSpacing: '0.02em', textTransform: 'uppercase' }}
              variant="caption"
            >
              {label}
            </Typography>
            <Typography
              sx={{
                fontSize: compact
                  ? { xs: '1.35rem', sm: '1.5rem' }
                  : { xs: '1.5rem', sm: '1.625rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
              variant="h5"
            >
              {value}
            </Typography>
            {helperText ? (
              <Typography color="text.secondary" sx={{ lineHeight: 1.35 }} variant="caption">
                {helperText}
              </Typography>
            ) : null}
          </Stack>
          {icon ? (
            <Stack
              alignItems="center"
              flexShrink={0}
              justifyContent="center"
              sx={{
                bgcolor: iconBgcolor,
                borderRadius: 2,
                color: accentColor,
                height: compact ? 40 : 48,
                width: compact ? 40 : 48,
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
