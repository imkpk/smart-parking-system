import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export type DashboardQuickActionTileProps = {
  title: string;
  description: string;
  ctaLabel: string;
  icon: ReactNode;
  accentColor?: string;
  iconBgcolor?: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
};

export function DashboardQuickActionTile({
  title,
  description,
  ctaLabel,
  icon,
  accentColor = 'primary.main',
  iconBgcolor = 'rgba(31, 111, 235, 0.1)',
  disabled = false,
  disabledReason,
  onClick,
}: DashboardQuickActionTileProps) {
  const helperText = disabled && disabledReason ? disabledReason : description;

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: disabled ? 'divider' : 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '100%',
        minWidth: 0,
        opacity: disabled ? 0.72 : 1,
        transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        width: '100%',
        ...(!disabled
          ? {
              '&:hover': {
                borderColor: accentColor,
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.1)',
                transform: 'translateY(-1px)',
              },
            }
          : {}),
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 1.5,
          p: { xs: 2, sm: 2.25 },
          '&:last-child': { pb: { xs: 2, sm: 2.25 } },
        }}
      >
        <Stack alignItems="flex-start" direction="row" spacing={1.5}>
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: iconBgcolor,
              borderRadius: 2,
              color: disabled ? 'text.disabled' : accentColor,
              display: 'flex',
              flexShrink: 0,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            {icon}
          </Box>
          <Stack flex={1} minWidth={0} spacing={0.5}>
            <Typography fontWeight={700} variant="subtitle1">
              {title}
            </Typography>
            <Typography
              color={disabled ? 'text.secondary' : 'text.secondary'}
              sx={{ lineHeight: 1.45 }}
              variant="body2"
            >
              {helperText}
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ mt: 'auto', pt: 0.5 }}>
          <Button
            disabled={disabled}
            fullWidth
            onClick={onClick}
            size="medium"
            variant={disabled ? 'outlined' : 'contained'}
          >
            {ctaLabel}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}