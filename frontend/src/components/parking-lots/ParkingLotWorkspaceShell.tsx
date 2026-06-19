import { Box, Chip, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { ViewModule } from '@mui/icons-material';
import { ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  ActionButtonGroup,
  HeaderActionButton,
} from '../common/PageHeader';
import {
  formatParkingLotLocation,
  getParkingLotSettingsPath,
  getParkingLotVisualMapPath,
  getParkingLotWorkspacePath,
  ParkingLotWorkspaceTab,
} from '../../lib/parkingLotWorkspace';
import { ParkingLot } from '../../types/parkingLot';

export function ParkingLotWorkspaceShell({
  activeTab,
  canManageLot = false,
  children,
  parkingLot,
}: {
  activeTab: ParkingLotWorkspaceTab;
  canManageLot?: boolean;
  children: ReactNode;
  parkingLot: ParkingLot;
}) {
  const navigate = useNavigate();
  const locationSummary = formatParkingLotLocation(parkingLot);
  const visualMapPath = getParkingLotVisualMapPath(parkingLot.id);

  const handleTabChange = (_event: unknown, nextTab: ParkingLotWorkspaceTab) => {
    if (nextTab === 'visual-map') {
      navigate(visualMapPath);
      return;
    }

    if (nextTab === 'settings') {
      navigate(getParkingLotSettingsPath(parkingLot.id));
      return;
    }

    navigate(getParkingLotWorkspacePath(parkingLot.id, nextTab));
  };

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 2, sm: 2.5 } }}>
        <Stack
          alignItems={{ xs: 'stretch', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack alignItems="center" direction="row" flexWrap="wrap" gap={1}>
              <Typography component="h1" sx={{ lineHeight: 1.25 }} variant="h5">
                {parkingLot.name}
              </Typography>
              <Chip
                color={parkingLot.isActive ? 'success' : 'default'}
                label={parkingLot.isActive ? 'Active' : 'Inactive'}
                size="small"
              />
            </Stack>
            <Stack
              alignItems="center"
              direction="row"
              flexWrap="wrap"
              gap={0.75}
              sx={{ mt: 0.5 }}
            >
              <Chip label={parkingLot.type} size="small" variant="outlined" />
              <Typography color="text.secondary" sx={{ minWidth: 0 }} variant="body2">
                {locationSummary}
              </Typography>
            </Stack>
          </Box>

          <ActionButtonGroup sx={{ flexShrink: 0 }}>
            {activeTab !== 'visual-map' ? (
              <HeaderActionButton
                component={RouterLink}
                startIcon={<ViewModule />}
                to={visualMapPath}
                variant="contained"
              >
                Open visual map
              </HeaderActionButton>
            ) : null}
            <HeaderActionButton component={RouterLink} to="/parking-lots" variant="outlined">
              Back
            </HeaderActionButton>
          </ActionButtonGroup>
        </Stack>

        <Tabs
          onChange={handleTabChange}
          sx={{ mt: 2 }}
          value={activeTab}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Visual Map" value="visual-map" />
          <Tab label="Slots" value="slots" />
          <Tab label="Floors" value="floors" />
          {canManageLot ? <Tab label="Settings" value="settings" /> : null}
        </Tabs>
      </Paper>

      {children}
    </Stack>
  );
}