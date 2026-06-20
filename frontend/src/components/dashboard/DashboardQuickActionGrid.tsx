import Grid from '@mui/material/GridLegacy';
import { DashboardQuickActionTile, DashboardQuickActionTileProps } from './DashboardQuickActionTile';

export type DashboardQuickActionGridItem = DashboardQuickActionTileProps & {
  id: string;
  hidden?: boolean;
};

function resolveTileColumns(actionCount: number) {
  if (actionCount <= 2) {
    return { xs: 12, sm: 6 } as const;
  }

  if (actionCount <= 4) {
    return { xs: 12, sm: 6, lg: 6 } as const;
  }

  return { xs: 12, sm: 6, lg: 4 } as const;
}

export function DashboardQuickActionGrid({ actions }: { actions: DashboardQuickActionGridItem[] }) {
  const visibleActions = actions.filter((action) => !action.hidden);
  const columns = resolveTileColumns(visibleActions.length);

  return (
    <Grid container spacing={2} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      {visibleActions.map((action) => {
        const { id, hidden: _hidden, ...tileProps } = action;

        return (
          <Grid item key={id} {...columns}>
            <DashboardQuickActionTile {...tileProps} />
          </Grid>
        );
      })}
    </Grid>
  );
}