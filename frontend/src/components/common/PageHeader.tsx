import { Box, Button, ButtonProps, Stack, SxProps, Theme, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      alignItems={{ xs: 'stretch', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      spacing={2}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
            lineHeight: 1.15,
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.95rem', sm: '1rem' },
              lineHeight: 1.45,
              mt: 1,
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? (
        <Box
          sx={{
            alignSelf: { xs: 'stretch', sm: 'center' },
            display: 'flex',
            flexShrink: 0,
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
          }}
        >
          {action}
        </Box>
      ) : null}
    </Stack>
  );
}

export function HeaderActionButton({
  children,
  sx,
  variant = 'contained',
  ...props
}: {
  children: ReactNode;
} & Omit<ButtonProps, 'size'> & Record<string, unknown>) {
  return (
    <Button
      size="medium"
      variant={variant}
      sx={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        width: { xs: '100%', sm: 'auto' },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export function ToolbarButton({ sx, ...props }: ButtonProps) {
  return (
    <Button
      size="medium"
      sx={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        width: { xs: '100%', sm: 'auto' },
        ...sx,
      }}
      {...props}
    />
  );
}

export function ActionButtonGroup({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack
      alignItems={{ xs: 'stretch', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      flexWrap="wrap"
      spacing={1}
      sx={{
        flexShrink: 0,
        justifyContent: { xs: 'stretch', sm: 'flex-end' },
        rowGap: 1,
        width: '100%',
        ...sx,
      }}
    >
      {children}
    </Stack>
  );
}