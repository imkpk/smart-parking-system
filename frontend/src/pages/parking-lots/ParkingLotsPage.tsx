import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import { Add, Delete, Edit, OpenInNew } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GridColDef } from '@mui/x-data-grid';
import { FormEvent, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  createParkingLot,
  deleteParkingLot,
  getParkingLots,
  updateParkingLot,
} from '../../api/parkingLotsApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailsDialog, DetailsRow } from '../../components/common/DetailsDialog';
import { HeaderActionButton, PageHeader } from '../../components/common/PageHeader';

import { createDetailsColumn } from '../../components/common/gridColumns';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { formatDateTime } from '../../lib/formatters';
import { filterParkingLots } from '../../lib/searchFilters';
import {
  ParkingLot,
  ParkingLotPayload,
  ParkingLotType,
  parkingLotTypeOptions,
} from '../../types/parkingLot';

function buildParkingLotSummaryRows(lot: ParkingLot): DetailsRow[] {
  return [
    { label: 'Parking Lot Name', value: lot.name },
    { label: 'Address', value: lot.address ?? '-' },
    { label: 'City', value: lot.city ?? '-' },
    { label: 'Status', value: lot.isActive ? 'Active' : 'Inactive' },
    { label: 'Created On', value: formatDateTime(lot.createdAt) },
    { label: 'Updated On', value: formatDateTime(lot.updatedAt) },
  ];
}

function buildParkingLotTechnicalRows(lot: ParkingLot): DetailsRow[] {
  return [{ label: 'parkingLotId', value: lot.id }];
}

const emptyForm: ParkingLotPayload = {
  name: '',
  type: 'APARTMENT',
  address: '',
  city: '',
  state: '',
  pincode: '',
  isActive: true,
};

export function ParkingLotsPage() {
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [formOpen, setFormOpen] = useState(false);
  const [editingParkingLot, setEditingParkingLot] = useState<ParkingLot | null>(null);
  const [form, setForm] = useState<ParkingLotPayload>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null);
  const [search, setSearch] = useState('');
  const [detailsParkingLot, setDetailsParkingLot] = useState<ParkingLot | null>(null);

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
  });

  const invalidateParkingLots = () =>
    queryClient.invalidateQueries({ queryKey: ['parking-lots'] });

  const createMutation = useMutation({
    mutationFn: createParkingLot,
    onSuccess: async () => {
      await invalidateParkingLots();
      showSuccess('Parking lot created.');
      closeForm();
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, 'Could not create parking lot.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ParkingLotPayload }) =>
      updateParkingLot(id, payload),
    onSuccess: async () => {
      await invalidateParkingLots();
      showSuccess('Parking lot updated.');
      closeForm();
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, 'Could not update parking lot.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteParkingLot,
    onSuccess: async () => {
      await invalidateParkingLots();
      showSuccess('Parking lot deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, 'Could not delete parking lot.'));
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const sortedParkingLots = useMemo(
    () => parkingLotsQuery.data ?? [],
    [parkingLotsQuery.data],
  );
  const filteredParkingLots = useMemo(
    () => filterParkingLots(sortedParkingLots, search),
    [search, sortedParkingLots],
  );
  const columns = useMemo<GridColDef<ParkingLot>[]>(
    () => [
      {
        field: 'name',
        flex: 1.1,
        headerName: 'Parking Lot Name',
        minWidth: 180,
      },
      { field: 'type', headerName: 'Type', minWidth: 140 },
      {
        field: 'location',
        flex: 1.3,
        headerName: 'Location',
        minWidth: 220,
        valueGetter: (_value, row) =>
          [row.address, row.city, row.state].filter(Boolean).join(', ') || '-',
      },
      { field: 'pincode', headerName: 'Pincode', minWidth: 120 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 120,
        renderCell: ({ row }) => (
          <Chip
            color={row.isActive ? 'success' : 'default'}
            label={row.isActive ? 'Active' : 'Inactive'}
            size="small"
          />
        ),
      },
      createDetailsColumn<ParkingLot>(setDetailsParkingLot),
      {
        field: 'actions',
        align: 'right',
        filterable: false,
        headerAlign: 'right',
        headerName: 'Actions',
        minWidth: 170,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" justifyContent="flex-end" width="100%">
            <Tooltip title="Manage Lot">
              <IconButton component={RouterLink} to={`/parking-lots/${row.id}`}>
                <OpenInNew />
              </IconButton>
            </Tooltip>
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
    [],
  );

  const openCreateForm = () => {
    setEditingParkingLot(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (parkingLot: ParkingLot) => {
    setEditingParkingLot(parkingLot);
    setForm({
      name: parkingLot.name,
      type: parkingLot.type,
      address: parkingLot.address ?? '',
      city: parkingLot.city ?? '',
      state: parkingLot.state ?? '',
      pincode: parkingLot.pincode ?? '',
      isActive: parkingLot.isActive,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }

    setFormOpen(false);
    setEditingParkingLot(null);
    setForm(emptyForm);
  };

  const updateField = <Key extends keyof ParkingLotPayload>(
    key: Key,
    value: ParkingLotPayload[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toPayload = () => ({
    ...form,
    address: form.address?.trim() || undefined,
    city: form.city?.trim() || undefined,
    state: form.state?.trim() || undefined,
    pincode: form.pincode?.trim() || undefined,
    name: form.name.trim(),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload();

    if (editingParkingLot) {
      updateMutation.mutate({ id: editingParkingLot.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        action={
          <HeaderActionButton onClick={openCreateForm} startIcon={<Add />}>
            Create Parking Lot
          </HeaderActionButton>
        }
        title="Parking Lots"
      />

      {parkingLotsQuery.isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {parkingLotsQuery.error ? (
        <Alert severity={isForbiddenError(parkingLotsQuery.error) ? 'warning' : 'error'}>
          {isForbiddenError(parkingLotsQuery.error)
            ? 'Access denied. Admin role is required to manage parking lots.'
            : getApiErrorMessage(parkingLotsQuery.error, 'Could not load parking lots.')}
        </Alert>
      ) : null}

      {parkingLotsQuery.data ? (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <AppDataGrid
            columns={columns}
            emptyState={{
              description: search
                ? 'Try a parking lot name, city, state, or pincode.'
                : 'Create a parking lot to start managing floors and slots.',
              illustration: search ? 'empty' : 'park',
              title: search ? 'No matching parking lots' : 'No parking lots found',
            }}
            loading={parkingLotsQuery.isFetching}
            rows={filteredParkingLots}
            search={{
              onChange: (event) => setSearch(event.target.value),
              onClear: () => setSearch(''),
              placeholder: 'Search by name, type, city, state, or pincode',
              value: search,
            }}
          />
        </Paper>
      ) : null}

      <Dialog fullWidth maxWidth="sm" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingParkingLot ? 'Edit Parking Lot' : 'Create Parking Lot'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                onChange={(event) => updateField('name', event.target.value)}
                required
                value={form.name}
              />
              <FormControl required>
                <InputLabel id="parking-lot-type-label">Type</InputLabel>
                <Select
                  label="Type"
                  labelId="parking-lot-type-label"
                  onChange={(event) => updateField('type', event.target.value as ParkingLotType)}
                  value={form.type}
                >
                  {parkingLotTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Address"
                onChange={(event) => updateField('address', event.target.value)}
                value={form.address}
              />
              <TextField
                label="City"
                onChange={(event) => updateField('city', event.target.value)}
                value={form.city}
              />
              <TextField
                label="State"
                onChange={(event) => updateField('state', event.target.value)}
                value={form.state}
              />
              <TextField
                label="Pincode"
                onChange={(event) => updateField('pincode', event.target.value)}
                value={form.pincode}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.isActive)}
                    onChange={(event) => updateField('isActive', event.target.checked)}
                  />
                }
                label="Active"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={isSaving} onClick={closeForm}>
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit" variant="contained">
              {editingParkingLot ? 'Save Changes' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <DetailsDialog
        onClose={() => setDetailsParkingLot(null)}
        open={Boolean(detailsParkingLot)}
        summaryRows={detailsParkingLot ? buildParkingLotSummaryRows(detailsParkingLot) : []}
        technicalRows={detailsParkingLot ? buildParkingLotTechnicalRows(detailsParkingLot) : []}
        title="Parking Lot Details"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.name}? This will mark the parking lot inactive.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        open={Boolean(deleteTarget)}
        title="Delete Parking Lot"
      />

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}
