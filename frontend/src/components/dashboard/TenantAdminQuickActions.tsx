import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import Layers from '@mui/icons-material/Layers';
import LocalParking from '@mui/icons-material/LocalParking';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Security from '@mui/icons-material/Security';
import ViewModule from '@mui/icons-material/ViewModule';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOnboardingStatus } from '../../api/dashboardApi';
import { useUserRole } from '../../hooks/useUserRole';
import { DASHBOARD_QUERY_STALE_MS } from '../../lib/dashboardQueryOptions';
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
    return {
      color: 'primary' as const,
      variant: 'filled' as const,
      sx: undefined,
      'aria-label': undefined,
    };
  }

  if (status === 'loading') {
    return {
      color: 'default' as const,
      variant: 'outlined' as const,
      sx: { opacity: 0.5 },
      'aria-label': 'Loading...',
    };
  }

  return {
    color: 'default' as const,
    variant: 'outlined' as const,
    sx: undefined,
    'aria-label': 'Incomplete',
  };
}

function TenantAdminOnboardingChecklist({
  steps,
  hint,
}: {
  steps: OnboardingStep[];
  hint: string | null;
}) {
  return (
    <Stack spacing={1.25}>
      <Typography color="text.primary" variant="body2" fontWeight={600}>
        Getting started checklist
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {steps.map((step) => {
          const chipProps = getChipProps(step.status);

          return (
            <Chip
              key={step.label}
              aria-label={chipProps['aria-label'] ?? step.label}
              label={step.label}
              size="small"
              color={chipProps.color}
              variant={chipProps.variant}
              sx={chipProps.sx}
            />
          );
        })}
      </Box>
      {hint ? (
        <Typography color="text.secondary" variant="caption">
          {hint}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function TenantAdminQuickActions() {
  const navigate = useNavigate();
  const { isTenantAdmin, isOperationalAdmin } = useUserRole();
  const canManageTenant = isOperationalAdmin || isTenantAdmin;
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<Role>('USER');

  const onboardingQuery = useQuery({
    queryKey: ['dashboard', 'onboarding-status'],
    queryFn: getOnboardingStatus,
    enabled: canManageTenant,
    staleTime: DASHBOARD_QUERY_STALE_MS,
  });

  const onboarding = onboardingQuery.data;
  const firstLot = onboarding?.firstLotId ? { id: onboarding.firstLotId } : undefined;
  const slotNavigationLot = onboarding?.firstLotWithFloorsId
    ? { id: onboarding.firstLotWithFloorsId }
    : firstLot;

  const hasLot = onboarding?.hasLot ?? false;
  const hasFloor = onboarding?.hasFloor ?? false;
  const hasSlot = onboarding?.hasSlot ?? false;
  const hasTeamAccess = onboarding?.hasTeamAccess ?? false;

  const onboardingLoading = onboardingQuery.isLoading;
  const lotsLoading = onboardingLoading;
  const floorsLoading = onboardingLoading;
  const slotsLoading = onboardingLoading;
  const teamLoading = onboardingLoading;

  const openCreateUser = (role: Role) => {
    setPresetRole(role);
    setCreateUserOpen(true);
  };

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
        onClick: () => {
          if (!firstLot) {
            return;
          }

          navigate(`${getParkingLotWorkspacePath(firstLot.id, 'floors')}?create=1`);
        },
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
        onClick: () => {
          if (!slotNavigationLot?.id) {
            return;
          }

          navigate(`${getParkingLotWorkspacePath(slotNavigationLot.id, 'slots')}?create=1`);
        },
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

  if (!canManageTenant) {
    return null;
  }

  return (
    <>
      <DashboardQuickActionsPanel
        description="Set up parking inventory and team access for this property."
        // helperContent={
        //   <TenantAdminOnboardingChecklist hint={onboardingHint} steps={onboardingSteps} />
        // }
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