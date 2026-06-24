import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import Layers from '@mui/icons-material/Layers';
import LocalParking from '@mui/icons-material/LocalParking';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Security from '@mui/icons-material/Security';
import ViewModule from '@mui/icons-material/ViewModule';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFloors } from '../../api/floorsApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { getSlots } from '../../api/slotsApi';
import { useUserRole } from '../../hooks/useUserRole';
import { getParkingLotWorkspacePath } from '../../lib/parkingLotWorkspace';
import { statusStyles } from '../../lib/statusStyles';
import { Role } from '../../types/auth';
import { CreateUserDialog } from '../users/CreateUserDialog';
import { DashboardQuickActionGrid, DashboardQuickActionGridItem } from './DashboardQuickActionGrid';
import { DashboardQuickActionsPanel } from './DashboardQuickActionsPanel';

export function TenantAdminQuickActions() {
  const navigate = useNavigate();
  const { isTenantAdmin, isOperationalAdmin } = useUserRole();
  const canManageTenant = isOperationalAdmin || isTenantAdmin;
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<Role>('USER');

  const lotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
    enabled: canManageTenant,
  });
  const lots = lotsQuery.data ?? [];

  const floorsQueries = useQueries({
    queries: lots.map((lot) => ({
      queryKey: ['parking-lots', lot.id, 'floors'],
      queryFn: () => getFloors(lot.id),
      enabled: canManageTenant && Boolean(lot.id),
    })),
  });

  const slotsQueries = useQueries({
    queries: lots.map((lot) => ({
      queryKey: ['parking-lots', lot.id, 'slots'],
      queryFn: () => getSlots(lot.id),
      enabled: canManageTenant && Boolean(lot.id),
    })),
  });

  const firstLot = lots[0];
  const firstLotWithFloors = lots.find(
    (lot, index) => (floorsQueries[index]?.data?.length ?? 0) > 0,
  );

  const hasLot = lots.length > 0;
  const hasFloor = floorsQueries.some((query) => (query.data?.length ?? 0) > 0);

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

  if (!canManageTenant) {
    return null;
  }

  return (
    <>
      <DashboardQuickActionsPanel
        description="Set up parking inventory and team access for this property."
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