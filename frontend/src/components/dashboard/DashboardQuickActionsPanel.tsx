import ExpandMore from '@mui/icons-material/ExpandMore';
import Grid from '@mui/material/GridLegacy';
import { Box, Collapse, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { KeyboardEvent, ReactNode, useMemo, useState } from 'react';
import { DashboardQuickActionGridItem } from './DashboardQuickActionGrid';

export type DashboardQuickActionPreviewItem = Pick<
  DashboardQuickActionGridItem,
  'id' | 'title' | 'icon' | 'accentColor' | 'iconBgcolor' | 'disabled' | 'hidden'
>;

function DashboardQuickActionPreviewChips({
  actions,
}: {
  actions: DashboardQuickActionPreviewItem[];
}) {
  const visibleActions = useMemo(
    () => actions.filter((action) => !action.hidden),
    [actions],
  );

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <Stack
      alignItems="center"
      direction="row"
      spacing={0.75}
      sx={{
        flex: 1,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        justifyContent: { xs: 'flex-start', sm: 'flex-end' },
        minWidth: 0,
        pl: { xs: 0, sm: 1 },
        rowGap: 0.75,
      }}
    >
      {visibleActions.map((action) => (
        <Tooltip key={action.id} title={action.title}>
          <Box
            aria-hidden
            sx={{
              alignItems: 'center',
              bgcolor: action.iconBgcolor ?? 'rgba(31, 111, 235, 0.1)',
              borderRadius: 1.5,
              color: action.disabled ? 'text.disabled' : (action.accentColor ?? 'primary.main'),
              display: 'flex',
              flexShrink: 0,
              height: 32,
              justifyContent: 'center',
              opacity: action.disabled ? 0.55 : 1,
              width: 32,
              '& svg': {
                fontSize: 18,
              },
            }}
          >
            {action.icon}
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
}

export function DashboardQuickActionsPanel({
  title = 'Quick actions',
  description = 'Choose what you want to do next.',
  defaultExpanded = false,
  previewActions,
  helperContent,
  children,
}: {
  title?: string;
  description?: string;
  defaultExpanded?: boolean;
  previewActions?: DashboardQuickActionPreviewItem[];
  helperContent?: ReactNode;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setExpanded((value) => !value);
  };

  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  const showPreviewChips = !expanded && previewActions && previewActions.length > 0;

  return (
    <Grid container spacing={2} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
      <Grid item xs={12}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: expanded ? { xs: 2, sm: 2.5 } : { xs: 1.25, sm: 1.5 },
            transition: 'padding 200ms ease',
          }}
        >
          <Stack
            alignItems="center"
            aria-expanded={expanded}
            direction="row"
            flexWrap={showPreviewChips ? { xs: 'wrap', sm: 'nowrap' } : 'nowrap'}
            onClick={toggleExpanded}
            onKeyDown={handleHeaderKeyDown}
            role="button"
            spacing={1}
            sx={{
              cursor: 'pointer',
              outline: 'none',
              rowGap: showPreviewChips ? 1 : 0,
              userSelect: 'none',
              '&:focus-visible': {
                borderRadius: 1,
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
              },
            }}
            tabIndex={0}
          >
            <Typography
              fontWeight={700}
              sx={{
                flex: expanded ? 1 : undefined,
                flexShrink: 0,
              }}
              variant="h6"
            >
              {title}
            </Typography>

            {showPreviewChips ? <DashboardQuickActionPreviewChips actions={previewActions} /> : null}

            {!showPreviewChips && expanded ? <Box flex={1} /> : null}

            <Box
              aria-hidden
              sx={{
                alignItems: 'center',
                color: 'text.secondary',
                display: 'flex',
                flexShrink: 0,
                ml: showPreviewChips ? { xs: 'auto', sm: 0 } : 0,
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            >
              <ExpandMore />
            </Box>
          </Stack>

          <Collapse in={expanded} timeout={200}>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography color="text.secondary" variant="body2">
                {description}
              </Typography>
              {helperContent ? (
                <Box
                  sx={{
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    p: 1.5,
                  }}
                >
                  {helperContent}
                </Box>
              ) : null}
              {children}
            </Stack>
          </Collapse>
        </Paper>
      </Grid>
    </Grid>
  );
}