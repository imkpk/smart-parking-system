import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import {
  createVehicle,
  deleteVehicle,
  getMyVehicles,
  getVehicles,
  updateVehicle,
} from '../../api/vehiclesApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailsDialog, DetailsRow } from '../../components/common/DetailsDialog';
import { HeaderActionButton, PageHeader } from '../../components/common/PageHeader';

import { createDetailsColumn } from '../../components/common/gridColumns';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { useReferenceLabels } from '../../hooks/useReferenceLabels';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { formatStatusLabel } from '../../lib/formatters';
import { filterVehicles } from '../../lib/searchFilters';
import { Vehicle, VehiclePayload, VehicleType, vehicleTypeOptions } from '../../types/vehicle';

function buildVehicleSummaryRows(
  vehicle: Vehicle,
  labels: ReturnType<typeof useReferenceLabels>,
  showOwner: boolean,
): DetailsRow[] {
  const rows: DetailsRow[] = [
    { label: 'Vehicle Number', value: vehicle.vehicleNumber },
    { label: 'Vehicle Type', value: formatStatusLabel(vehicle.vehicleType) },
    { label: 'Brand', value: vehicle.brand ?? '-' },
    { label: 'Model', value: vehicle.model ?? '-' },
    { label: 'Color', value: vehicle.color ?? '-' },
  ];

  if (showOwner) {
    rows.push({ label: 'Owner', value: labels.getCustomerLabel(vehicle.userId) });
  }

  return rows;
}

function buildVehicleTechnicalRows(vehicle: Vehicle): DetailsRow[] {
  return [
    { label: 'vehicleId', value: vehicle.id },
    { label: 'userId', value: vehicle.userId },
    { label: 'vehicleType', value: vehicle.vehicleType },
  ];
}

const emptyVehicleForm: VehiclePayload = {
  vehicleNumber: '',
  vehicleType: 'CAR',
  brand: '',
  model: '',
  color: '',
};

export function VehiclesPage() {
  const { user, isAdmin, isUser } = useUserRole();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const labels = useReferenceLabels({
    context: 'vehicles',
    includeUsers: isAdmin,
    role: user?.role,
  });
  const canManageVehicles = isAdmin || isUser;
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehiclePayload>(emptyVehicleForm);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [detailsVehicle, setDetailsVehicle] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState('');

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', isAdmin ? 'all' : 'my'],
    queryFn: isAdmin ? getVehicles : getMyVehicles,
    enabled: canManageVehicles,
  });

  const invalidateVehicles = () =>
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      await invalidateVehicles();
      showSuccess('Vehicle created.');
      closeForm();
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: VehiclePayload }) =>
      updateVehicle(id, payload),
    onSuccess: async () => {
      await invalidateVehicles();
      showSuccess('Vehicle updated.');
      closeForm();
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: async () => {
      await invalidateVehicles();
      showSuccess('Vehicle deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });

  const vehicleRows = useMemo(
    () => filterVehicles(vehiclesQuery.data ?? [], search, labels, isAdmin),
    [isAdmin, labels, search, vehiclesQuery.data],
  );

  const columns = useMemo<GridColDef<Vehicle>[]>(
    () => [
      { field: 'vehicleNumber', flex: 1, headerName: 'Vehicle Number', minWidth: 170 },
      { field: 'vehicleType', headerName: 'Vehicle Type', minWidth: 120 },
      { field: 'brand', headerName: 'Brand', minWidth: 140 },
      { field: 'model', headerName: 'Model', minWidth: 140 },
      { field: 'color', headerName: 'Color', minWidth: 120 },
      ...(isAdmin
        ? [
            {
              field: 'userId',
              flex: 1,
              headerName: 'Owner',
              minWidth: 220,
              valueGetter: (_value, row) => labels.getCustomerLabel(row.userId),
            } satisfies GridColDef<Vehicle>,
          ]
        : []),
      createDetailsColumn<Vehicle>(setDetailsVehicle),
      {
        field: 'actions',
        align: 'right',
        filterable: false,
        headerAlign: 'right',
        headerName: 'Actions',
        minWidth: 130,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" justifyContent="flex-end" width="100%">
            <Tooltip title="Edit">
              <IconButton onClick={() => openEditForm(row)}>
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => setDeleteTarget(row)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [isAdmin, labels],
  );

  const closeForm = () => {
    setFormOpen(false);
    setEditingVehicle(null);
    setVehicleForm(emptyVehicleForm);
  };

  const openCreateForm = () => {
    setEditingVehicle(null);
    setVehicleForm(emptyVehicleForm);
    setFormOpen(true);
  };

  const openEditForm = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand ?? '',
      model: vehicle.model ?? '',
      color: vehicle.color ?? '',
    });
    setFormOpen(true);
  };

  const toPayload = () => ({
    vehicleNumber: vehicleForm.vehicleNumber.trim(),
    vehicleType: vehicleForm.vehicleType,
    brand: vehicleForm.brand?.trim() || undefined,
    model: vehicleForm.model?.trim() || undefined,
    color: vehicleForm.color?.trim() || undefined,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload();

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Vehicles"
        action={
          canManageVehicles ? (
            <HeaderActionButton onClick={openCreateForm} startIcon={<Add />}>
              Add Vehicle
            </HeaderActionButton>
          ) : null
        }
      />

      {vehiclesQuery.error ? (
        <Alert severity={isForbiddenError(vehiclesQuery.error) ? 'warning' : 'error'}>
          {isForbiddenError(vehiclesQuery.error)
            ? 'Access denied.'
            : getApiErrorMessage(vehiclesQuery.error, 'Could not load vehicles.')}
        </Alert>
      ) : null}

      <AppDataGrid
        columns={columns}
        emptyState={{
          description: search
            ? 'Try a vehicle number, brand, model, or owner name.'
            : 'Register a vehicle to start creating bookings.',
          illustration: search ? 'empty' : 'cityDriver',
          title: search ? 'No matching vehicles' : 'No vehicles found',
        }}
        loading={vehiclesQuery.isLoading || vehiclesQuery.isFetching}
        rows={vehicleRows}
        search={{
          onChange: (event) => setSearch(event.target.value),
          onClear: () => setSearch(''),
          placeholder: 'Search by vehicle number, type, brand, model, color, or owner',
          value: search,
        }}
      />

      <Dialog fullWidth maxWidth="sm" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Vehicle Number"
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, vehicleNumber: event.target.value }))
                }
                required
                value={vehicleForm.vehicleNumber}
              />
              <FormControl required>
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  label="Vehicle Type"
                  onChange={(event) =>
                    setVehicleForm((current) => ({
                      ...current,
                      vehicleType: event.target.value as VehicleType,
                    }))
                  }
                  value={vehicleForm.vehicleType}
                >
                  {vehicleTypeOptions.map((vehicleType) => (
                    <MenuItem key={vehicleType} value={vehicleType}>
                      {vehicleType}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Brand"
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, brand: event.target.value }))
                }
                value={vehicleForm.brand}
              />
              <TextField
                label="Model"
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, model: event.target.value }))
                }
                value={vehicleForm.model}
              />
              <TextField
                label="Color"
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, color: event.target.value }))
                }
                value={vehicleForm.color}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm}>Cancel</Button>
            <Button disabled={createMutation.isPending || updateMutation.isPending} type="submit" variant="contained">
              {editingVehicle ? 'Save Changes' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <DetailsDialog
        onClose={() => setDetailsVehicle(null)}
        open={Boolean(detailsVehicle)}
        summaryRows={
          detailsVehicle ? buildVehicleSummaryRows(detailsVehicle, labels, isAdmin) : []
        }
        technicalRows={detailsVehicle ? buildVehicleTechnicalRows(detailsVehicle) : []}
        title="Vehicle Details"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={deleteTarget ? `Delete vehicle ${deleteTarget.vehicleNumber}?` : ''}
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        open={Boolean(deleteTarget)}
        title="Delete Vehicle"
      />

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}
