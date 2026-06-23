import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import Layers from '@mui/icons-material/Layers';
import LocalParking from '@mui/icons-material/LocalParking';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Security from '@mui/icons-material/Security';
import ViewModule from '@mui/icons-material/ViewModule';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFloors } from '../../api/floorsApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { getSlots } from '../../api/slotsApi';
import { getUserSummary } from '../../api/usersApi';
import { useUserRole } from '../../hooks/useUserRole';
import { getParkingLotWorkspacePath } from '../../lib/parkingLotWorkspace';
import { statusStyles } from '../../lib/statusStyles';
import { Role } from '../../types/auth';
import { CreateUserDialog } from '../users/CreateUserDialog';
import { DashboardQuickActionGrid, DashboardQuickActionGridItem } from './DashboardQuickActionGrid';
import { DashboardQuickActionsPanel } from './DashboardQuickActionsPanel';

type OnboardingStepStatus = 'loading' | 'complete' | 'incomplete';

type OnboardingStep = {
  label: string;
  status: OnboardingStepStatus;
};

function getChipProps(status: OnboardingStepStatus) {
  if (status === 'complete') {
    return { color: 'primary' as const, variant: 'filled' as const };
  }

  return { color: 'default' as const, variant: 'outlined' as const };
}

export function TenantAdminQuickActions() {
  const navigate = useNavigate();
  const { isTenantAdmin, isOperationalAdmin } = useUserRole();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<Role>('USER');

  const lotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
  });
  const lots = lotsQuery.data ?? [];

  const floorsQueries = useQueries({
    queries: lots.map((lot) => ({
      queryKey: ['parking-lots', lot.id, 'floors'],
      queryFn: () => getFloors(lot.id),
      enabled: Boolean(lot.id),
    })),
  });

  const slotsQueries = useQueries({
    queries: lots.map((lot) => ({
      queryKey: ['parking-lots', lot.id, 'slots'],
      queryFn: () => getSlots(lot.id),
      enabled: Boolean(lot.id),
    })),
  });

  const userSummaryQuery = useQuery({
    queryKey: ['users', 'summary'],
    queryFn: getUserSummary,
  });

  const firstLot = lots[0];
  const firstLotWithFloors = lots.find(
    (lot, index) => (floorsQueries[index]?.data?.length ?? 0) > 0,
  );

  const hasLot = lots.length > 0;
  const hasFloor = floorsQueries.some((query) => (query.data?.length ?? 0) > 0);
  const hasSlot = slotsQueries.some((query) => (query.data?.length ?? 0) > 0);
  const hasTeamAccess =
    (userSummaryQuery.data?.admins ?? 0) +
      (userSummaryQuery.data?.security ?? 0) +
      (userSummaryQuery.data?.users ?? 0) >
    0;

  const lotsLoading = lotsQuery.isLoading;
  const floorsLoading =
    lotsLoading || (lots.length > 0 && floorsQueries.some((query) => query.isLoading));
  const slotsLoading =
    lotsLoading || (lots.length > 0 && slotsQueries.some((query) => query.isLoading));
  const teamLoading = userSummaryQuery.isLoading;

  const openCreateUser = (role: Role) => {
    setPresetRole(role);
    setCreateUserOpen(true);
  };

  const slotNavigationLot = firstLotWithFloors ?? firstLot;

  const actions = useMemo<DashboardQuickActionGridItem[]>(
    () => [
      {
        id: 'create-parking-lot',
        title: 'Create Parking Lot',
        description: 'Add a new parking area for this property.',
        ctaLabel: 'Create parking lot',
        icon: <LocalParking />,
        accentColor: statusStyles.CONFIRMED.borderColor,
        iconBgcolor: statusStyles.CONFIRMED.bgcolor,
        onClick: () => navigate('/parking-lots?create=1'),
      },
      {
        id: 'create-floor',
        title: 'Create Floor',
        description: 'Add floor or level details before adding slots.',
        ctaLabel: 'Create floor',
        icon: <Layers />,
        accentColor: statusStyles.PENDING.borderColor,
        iconBgcolor: statusStyles.PENDING.bgcolor,
        disabled: !hasLot,
        disabledReason: 'Create a parking lot first.',
        onClick: () => navigate(`${getParkingLotWorkspacePath(firstLot!.id, 'floors')}?create=1`),
      },
      {
        id: 'create-slot',
        title: 'Create Slot',
        description: 'Add individual parking slots for vehicles.',
        ctaLabel: 'Create slot',
        icon: <ViewModule />,
        accentColor: statusStyles.RESERVED.borderColor,
        iconBgcolor: statusStyles.RESERVED.bgcolor,
        disabled: !hasFloor,
        disabledReason: 'Create a floor first.',
        onClick: () =>
          navigate(`${getParkingLotWorkspacePath(slotNavigationLot!.id, 'slots')}?create=1`),
      },
      {
        id: 'create-user',
        title: 'Create User',
        description: 'Add a resident or customer account.',
        ctaLabel: 'Create user',
        icon: <PersonAdd fontSize="small" />,
        accentColor: statusStyles.PENDING.borderColor,
        iconBgcolor: statusStyles.PENDING.bgcolor,
        hidden: !isOperationalAdmin,
        onClick: () => openCreateUser('USER'),
      },
      {
        id: 'create-admin',
        title: 'Create Admin',
        description: 'Add a manager for this property.',
        ctaLabel: 'Create admin',
        icon: <AdminPanelSettings />,
        accentColor: statusStyles.COMPLETED.borderColor,
        iconBgcolor: statusStyles.COMPLETED.bgcolor,
        hidden: !isTenantAdmin,
        onClick: () => openCreateUser('ADMIN'),
      },
      {
        id: 'create-security',
        title: 'Create Security',
        description: 'Add a gate operator for check-in and check-out.',
        ctaLabel: 'Create security',
        icon: <Security />,
        accentColor: statusStyles.ACTIVE.borderColor,
        iconBgcolor: statusStyles.ACTIVE.bgcolor,
        hidden: !isOperationalAdmin,
        onClick: () => openCreateUser('SECURITY'),
      },
    ],
    [
      firstLot,
      hasFloor,
      hasLot,
      isOperationalAdmin,
      isTenantAdmin,
      navigate,
      slotNavigationLot,
    ],
  );

  const onboardingSteps = useMemo<OnboardingStep[]>(
    () => [
      {
        label: 'Create a parking lot',
        status: lotsLoading ? 'loading' : hasLot ? 'complete' : 'incomplete',
      },
      {
        label: 'Add a floor',
        status: floorsLoading ? 'loading' : hasFloor ? 'complete' : 'incomplete',
      },
      {
        label: 'Create a slot',
        status: slotsLoading ? 'loading' : hasSlot ? 'complete' : 'incomplete',
      },
      {
        label: 'Add team access',
        status: teamLoading ? 'loading' : hasTeamAccess ? 'complete' : 'incomplete',
      },
    ],
    [floorsLoading, hasFloor, hasLot, hasSlot, hasTeamAccess, lotsLoading, slotsLoading, teamLoading],
  );

  const onboardingHint = useMemo(() => {
    const isLoading = onboardingSteps.some((step) => step.status === 'loading');
    if (isLoading) {
      return null;
    }

    const allComplete = onboardingSteps.every((step) => step.status === 'complete');
    if (allComplete) {
      return 'Setup complete. You can now manage bookings and gate operations.';
    }

    return 'Complete these steps to start accepting bookings.';
  }, [onboardingSteps]);

  if (!isOperationalAdmin && !isTenantAdmin) {
    return null;
  }

  const helperContent = (
    <Stack spacing={1.25}>
      <Typography color="text.primary" variant="body2" fontWeight={600}>
        Getting started checklist
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {onboardingSteps.map((step) => (
          <Chip
            key={step.label}
            label={step.label}
            size="small"
            {...getChipProps(step.status)}
          />
        ))}
      </Box>
      {onboardingHint ? (
        <Typography color="text.secondary" variant="caption">
          {onboardingHint}
        </Typography>
      ) : null}
    </Stack>
  );

  return (
    <>
      <DashboardQuickActionsPanel
        description="Set up parking inventory and team access for this property."
        helperContent={helperContent}
        previewActions={actions}
      >
        <DashboardQuickActionGrid actions={actions} />
      </DashboardQuickActionsPanel>

      <CreateUserDialog
        onClose={() => setCreateUserOpen(false)}
        open={createUserOpen}
        presetRole={presetRole}
      />
    </>
  );
}