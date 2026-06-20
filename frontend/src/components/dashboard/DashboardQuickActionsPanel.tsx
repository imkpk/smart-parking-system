import Grid from '@mui/material/GridLegacy';
import { Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function DashboardQuickActionsPanel({
  title = 'Quick actions',
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <Grid container spacing={2} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      <Grid item xs={12}>
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">{title}</Typography>
            {children}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}