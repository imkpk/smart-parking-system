import { Button, Stack, Tooltip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFloors } from '../../api/floorsApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { useUserRole } from '../../hooks/useUserRole';
import { getParkingLotWorkspacePath } from '../../lib/parkingLotWorkspace';
import { Role } from '../../types/auth';
import { CreateUserDialog } from '../users/CreateUserDialog';
import { DashboardQuickActionsPanel } from './DashboardQuickActionsPanel';

type QuickAction = {
  label: string;
  disabled?: boolean;
  helperText?: string;
  hidden?: boolean;
  onClick: () => void;
};

export function TenantAdminQuickActions() {
  const navigate = useNavigate();
  const { isTenantAdmin, isOperationalAdmin } = useUserRole();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<Role>('USER');

  const lotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
  });
  const firstLot = lotsQuery.data?.[0];
  const floorsQuery = useQuery({
    queryKey: ['parking-lots', firstLot?.id, 'floors'],
    queryFn: () => getFloors(firstLot!.id),
    enabled: Boolean(firstLot?.id),
  });

  const hasLot = (lotsQuery.data?.length ?? 0) > 0;
  const hasFloor = (floorsQuery.data?.length ?? 0) > 0;

  if (!isOperationalAdmin && !isTenantAdmin) {
    return null;
  }

  const openCreateUser = (role: Role) => {
    setPresetRole(role);
    setCreateUserOpen(true);
  };

  const actions: QuickAction[] = [
    {
      label: 'Create Parking Lot',
      onClick: () => navigate('/parking-lots?create=1'),
    },
    {
      label: 'Create Floor',
      disabled: !hasLot,
      helperText: 'Create parking lot first',
      onClick: () => navigate(`${getParkingLotWorkspacePath(firstLot!.id, 'floors')}?create=1`),
    },
    {
      label: 'Create Slot',
      disabled: !hasFloor,
      helperText: 'Create floor first',
      onClick: () => navigate(`${getParkingLotWorkspacePath(firstLot!.id, 'slots')}?create=1`),
    },
    {
      label: 'Create User',
      hidden: !isOperationalAdmin,
      onClick: () => openCreateUser('USER'),
    },
    {
      label: 'Create Admin',
      hidden: !isTenantAdmin,
      onClick: () => openCreateUser('ADMIN'),
    },
    {
      label: 'Create Security',
      hidden: !isOperationalAdmin,
      onClick: () => openCreateUser('SECURITY'),
    },
  ];

  return (
    <>
      <DashboardQuickActionsPanel>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {actions
            .filter((action) => !action.hidden)
            .map((action) => (
              <Tooltip
                key={action.label}
                title={action.disabled ? (action.helperText ?? '') : ''}
              >
                <span>
                  <Button
                    disabled={action.disabled}
                    onClick={action.onClick}
                    size="small"
                    variant="outlined"
                  >
                    {action.label}
                  </Button>
                </span>
              </Tooltip>
            ))}
        </Stack>
      </DashboardQuickActionsPanel>

      <CreateUserDialog
        onClose={() => setCreateUserOpen(false)}
        open={createUserOpen}
        presetRole={presetRole}
      />
    </>
  );
}