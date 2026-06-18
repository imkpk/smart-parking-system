import Grid from '@mui/material/GridLegacy';
import { Stack, useMediaQuery, useTheme } from '@mui/material';
import { ReactNode } from 'react';
import { useObservedHeight } from '../../hooks/useObservedHeight';
import { RecentActivityTimeline } from './RecentActivityTimeline';

export function DashboardSummaryColumns({
  left,
  leftMd = 7,
  leftLg = 7,
  rightMd = 5,
  rightLg = 5,
}: {
  left: ReactNode;
  leftMd?: number;
  leftLg?: number;
  rightMd?: number;
  rightLg?: number;
}) {
  const theme = useTheme();
  const isSideBySide = useMediaQuery(theme.breakpoints.up('md'));
  const { height: leftColumnHeight, ref: leftColumnRef } = useObservedHeight<HTMLDivElement>();

  return (
    <Grid
      alignItems="flex-start"
      container
      spacing={2}
      sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}
    >
      <Grid item lg={leftLg} md={leftMd} sx={{ maxWidth: '100%', minWidth: 0 }} xs={12}>
        <Stack ref={leftColumnRef} spacing={2} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
          {left}
        </Stack>
      </Grid>
      <Grid item lg={rightLg} md={rightMd} sx={{ maxWidth: '100%', minWidth: 0 }} xs={12}>
        <RecentActivityTimeline
          fillHeight={isSideBySide}
          matchedHeight={isSideBySide ? leftColumnHeight : undefined}
          sx={{ width: '100%' }}
        />
      </Grid>
    </Grid>
  );
}