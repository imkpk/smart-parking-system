import Grid from '@mui/material/GridLegacy';
import { Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function DashboardQuickActionsPanel({
  title = 'Quick actions',
  description = 'Choose what you want to do next.',
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Grid container spacing={2} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      <Grid item xs={12}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography fontWeight={700} variant="h6">
                {title}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {description}
              </Typography>
            </Stack>
            {children}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}