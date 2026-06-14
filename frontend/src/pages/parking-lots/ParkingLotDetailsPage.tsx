import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, Layers, LocalParking, ViewModule } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GridColDef, GridRowId } from '@mui/x-data-grid';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getParkingLot } from '../../api/parkingLotsApi';
import { createFloor, deleteFloor, getFloors, updateFloor } from '../../api/floorsApi';
import {
  createBulkSlots,
  createSlot,
  deleteSlot,
  deleteSlots,
  getSlots,
  updateSlotStatus,
} from '../../api/slotsApi';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { PageHeader } from '../../components/common/PageHeader';
import { SlotStatusChip } from '../../components/common/SlotStatusChip';
import { StatCard } from '../../components/common/StatCard';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { slotStatusStyles } from '../../lib/slotStatusStyles';
import { Floor, FloorPayload } from '../../types/floor';
import {
  BulkSlotForm,
  Slot,
  SlotPayload,
  SlotStatus,
  SlotType,
  slotStatusOptions,
  slotTypeOptions,
} from '../../types/slot';

type SnackbarState = { message: string; severity: 'success' | 'error' } | null;

const emptyFloorForm: FloorPayload = {
  name: '',
  level: 0,
};

const emptySlotForm: SlotPayload & { floorId: number | '' } = {
  floorId: '',
  slotNumber: '',
  slotType: 'CAR',
  status: 'AVAILABLE',
};

const emptyBulkForm: BulkSlotForm = {
  floorId: 0,
  prefix: 'A',
  startNumber: 1,
  count: 10,
  slotType: 'CAR',
};

function getTabFromPath(pathname: string) {
  if (pathname.endsWith('/floors')) {
    return 'floors';
  }

  if (pathname.endsWith('/slots')) {
    return 'slots';
  }

  return 'overview';
}

export function ParkingLotDetailsPage() {
  const { id } = useParams();
  const parkingLotId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeTab = getTabFromPath(location.pathname);

  const [floorFormOpen, setFloorFormOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [floorForm, setFloorForm] = useState<FloorPayload>(emptyFloorForm);
  const [deleteFloorTarget, setDeleteFloorTarget] = useState<Floor | null>(null);
  const [slotFormOpen, setSlotFormOpen] = useState(false);
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkSlotForm>(emptyBulkForm);
  const [slotFloorFilter, setSlotFloorFilter] = useState<number | 'ALL'>('ALL');
  const [slotStatusFilter, setSlotStatusFilter] = useState<SlotStatus | 'ALL'>('ALL');
  const [slotTypeFilter, setSlotTypeFilter] = useState<SlotType | 'ALL'>('ALL');
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<Slot | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const parkingLotQuery = useQuery({
    queryKey: ['parking-lots', parkingLotId],
    queryFn: () => getParkingLot(parkingLotId),
    enabled: Number.isFinite(parkingLotId),
  });
  const floorsQuery = useQuery({
    queryKey: ['parking-lots', parkingLotId, 'floors'],
    queryFn: () => getFloors(parkingLotId),
    enabled: Number.isFinite(parkingLotId),
  });
  const slotsQuery = useQuery({
    queryKey: ['parking-lots', parkingLotId, 'slots'],
    queryFn: () => getSlots(parkingLotId),
    enabled: Number.isFinite(parkingLotId),
  });

  const floors = floorsQuery.data ?? [];
  const slots = slotsQuery.data ?? [];
  const floorNameById = useMemo(
    () => new Map(floors.map((floor) => [floor.id, floor.name])),
    [floors],
  );
  const filteredSlots = useMemo(
    () =>
      slots.filter((slot) => {
        const floorMatches = slotFloorFilter === 'ALL' || slot.floorId === slotFloorFilter;
        const statusMatches = slotStatusFilter === 'ALL' || slot.status === slotStatusFilter;
        const typeMatches = slotTypeFilter === 'ALL' || slot.slotType === slotTypeFilter;
        return floorMatches && statusMatches && typeMatches;
      }),
    [slotFloorFilter, slotStatusFilter, slotTypeFilter, slots],
  );
  const filteredSlotIds = useMemo(
    () => filteredSlots.map((slot) => slot.id),
    [filteredSlots],
  );
  const slotStatusCounts = useMemo(
    () =>
      slots.reduce(
        (counts, slot) => ({
          ...counts,
          [slot.status]: counts[slot.status] + 1,
        }),
        {
          AVAILABLE: 0,
          OCCUPIED: 0,
          RESERVED: 0,
          MAINTENANCE: 0,
        } satisfies Record<SlotStatus, number>,
      ),
    [slots],
  );

  const invalidateStructure = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parking-lots', parkingLotId, 'floors'] }),
      queryClient.invalidateQueries({ queryKey: ['parking-lots', parkingLotId, 'slots'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const floorMutationOptions = {
    onError: (error: unknown) => {
      setSnackbar({ message: getApiErrorMessage(error), severity: 'error' });
    },
  };

  const createFloorMutation = useMutation({
    mutationFn: (payload: FloorPayload) => createFloor(parkingLotId, payload),
    onSuccess: async () => {
      await invalidateStructure();
      setSnackbar({ message: 'Floor created.', severity: 'success' });
      closeFloorForm();
    },
    ...floorMutationOptions,
  });
  const updateFloorMutation = useMutation({
    mutationFn: ({ floorId, payload }: { floorId: number; payload: FloorPayload }) =>
      updateFloor(floorId, payload),
    onSuccess: async () => {
      await invalidateStructure();
      setSnackbar({ message: 'Floor updated.', severity: 'success' });
      closeFloorForm();
    },
    ...floorMutationOptions,
  });
  const deleteFloorMutation = useMutation({
    mutationFn: deleteFloor,
    onSuccess: async () => {
      await invalidateStructure();
      setSnackbar({ message: 'Floor deleted.', severity: 'success' });
      setDeleteFloorTarget(null);
    },
    ...floorMutationOptions,
  });
  const createSlotMutation = useMutation({
    mutationFn: ({ floorId, payload }: { floorId: number; payload: SlotPayload }) =>
      createSlot(floorId, payload),
    onSuccess: async () => {
      await invalidateStructure();
      setSnackbar({ message: 'Slot created.', severity: 'success' });
      setSlotFormOpen(false);
      setSlotForm(emptySlotForm);
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });
  const bulkSlotMutation = useMutation({
    mutationFn: (payload: BulkSlotForm) => {
      const generatedSlots = Array.from({ length: payload.count }, (_, index) => ({
        slotNumber: `${payload.prefix}${payload.startNumber + index}`,
        slotType: payload.slotType,
        status: 'AVAILABLE' as SlotStatus,
      }));
      return createBulkSlots(payload.floorId, generatedSlots);
    },
    onSuccess: async (_createdSlots, variables) => {
      await invalidateStructure();
      setSnackbar({ message: `${variables.count} slots created.`, severity: 'success' });
      setBulkFormOpen(false);
      setBulkForm({ ...emptyBulkForm, floorId: floors[0]?.id ?? 0 });
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ slotId, status }: { slotId: number; status: SlotStatus }) =>
      updateSlotStatus(slotId, status),
    onSuccess: async () => {
      await invalidateStructure();
      setSnackbar({ message: 'Slot status updated.', severity: 'success' });
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });
  const deleteSlotMutation = useMutation({
    mutationFn: deleteSlot,
    onSuccess: async (_deletedSlot, slotId) => {
      await invalidateStructure();
      setSelectedSlotIds((current) => current.filter((id) => id !== slotId));
      setDeleteSlotTarget(null);
      setSnackbar({ message: 'Slot deleted.', severity: 'success' });
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });
  const bulkDeleteSlotsMutation = useMutation({
    mutationFn: deleteSlots,
    onSuccess: async (_result, ids) => {
      await invalidateStructure();
      setSelectedSlotIds((current) => current.filter((id) => !ids.includes(id)));
      setBulkDeleteOpen(false);
      setSnackbar({ message: `${ids.length} slots deleted.`, severity: 'success' });
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });

  const closeFloorForm = () => {
    setFloorFormOpen(false);
    setEditingFloor(null);
    setFloorForm(emptyFloorForm);
  };

  const openCreateFloorForm = () => {
    setEditingFloor(null);
    setFloorForm(emptyFloorForm);
    setFloorFormOpen(true);
  };

  const openEditFloorForm = (floor: Floor) => {
    setEditingFloor(floor);
    setFloorForm({ name: floor.name, level: floor.level ?? 0 });
    setFloorFormOpen(true);
  };

  const handleFloorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { name: floorForm.name.trim(), level: Number(floorForm.level ?? 0) };

    if (editingFloor) {
      updateFloorMutation.mutate({ floorId: editingFloor.id, payload });
      return;
    }

    createFloorMutation.mutate(payload);
  };

  const openCreateSlotForm = () => {
    setSlotForm({ ...emptySlotForm, floorId: floors[0]?.id ?? '' });
    setSlotFormOpen(true);
  };

  const openBulkForm = () => {
    setBulkForm({ ...emptyBulkForm, floorId: floors[0]?.id ?? 0 });
    setBulkFormOpen(true);
  };

  const handleCreateSlotSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!slotForm.floorId) {
      setSnackbar({ message: 'Please select a floor.', severity: 'error' });
      return;
    }

    createSlotMutation.mutate({
      floorId: Number(slotForm.floorId),
      payload: {
        slotNumber: slotForm.slotNumber.trim(),
        slotType: slotForm.slotType,
        status: slotForm.status,
      },
    });
  };

  const handleBulkSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bulkForm.floorId || bulkForm.count < 1) {
      setSnackbar({ message: 'Please select a floor and valid slot count.', severity: 'error' });
      return;
    }

    bulkSlotMutation.mutate({
      ...bulkForm,
      prefix: bulkForm.prefix.trim(),
      startNumber: Number(bulkForm.startNumber),
      count: Number(bulkForm.count),
    });
  };

  const handleTabChange = (_event: unknown, nextTab: string) => {
    if (nextTab === 'overview') {
      navigate(`/parking-lots/${parkingLotId}`);
      return;
    }

    navigate(`/parking-lots/${parkingLotId}/${nextTab}`);
  };

  const toggleSlotSelection = (slotId: number) => {
    setSelectedSlotIds((current) =>
      current.includes(slotId)
        ? current.filter((id) => id !== slotId)
        : [...current, slotId],
    );
  };

  const setSlotSelection = (ids: GridRowId[]) => {
    setSelectedSlotIds(ids.map(Number));
  };

  const toggleAllFilteredSlots = () => {
    const allFilteredSelected =
      filteredSlotIds.length > 0 && filteredSlotIds.every((id) => selectedSlotIds.includes(id));

    if (allFilteredSelected) {
      setSelectedSlotIds((current) => current.filter((id) => !filteredSlotIds.includes(id)));
      return;
    }

    setSelectedSlotIds((current) => Array.from(new Set([...current, ...filteredSlotIds])));
  };

  const firstError = parkingLotQuery.error ?? floorsQuery.error ?? slotsQuery.error;
  const isLoading = parkingLotQuery.isLoading || floorsQuery.isLoading || slotsQuery.isLoading;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={parkingLotQuery.data?.name ?? 'Parking Lot Details'}
        description="Manage floors, slots, and parking capacity for this parking lot."
        action={
          <Button component={RouterLink} to="/parking-lots" variant="outlined">
            Back
          </Button>
        }
      />

      {isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {firstError ? (
        <Alert severity={isForbiddenError(firstError) ? 'warning' : 'error'}>
          {isForbiddenError(firstError)
            ? 'Access denied. Admin role is required.'
            : getApiErrorMessage(firstError, 'Could not load parking lot details.')}
        </Alert>
      ) : null}

      {parkingLotQuery.data ? (
        <>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Tabs
              onChange={handleTabChange}
              value={activeTab}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" value="overview" />
              <Tab label="Floors" value="floors" />
              <Tab label="Slots" value="slots" />
            </Tabs>
          </Paper>

          {activeTab === 'overview' ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard icon={<Layers />} label="Floors" value={floors.length} />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard icon={<ViewModule />} label="Total Slots" value={slots.length} />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  accentColor={slotStatusStyles.AVAILABLE.borderColor}
                  icon={<LocalParking />}
                  iconBgcolor={slotStatusStyles.AVAILABLE.bgcolor}
                  label="Available"
                  value={slotStatusCounts.AVAILABLE}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  accentColor={slotStatusStyles.OCCUPIED.borderColor}
                  iconBgcolor={slotStatusStyles.OCCUPIED.bgcolor}
                  label="Occupied"
                  value={slotStatusCounts.OCCUPIED}
                />
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
                  <Typography fontWeight={700} mb={2}>
                    Parking Lot Info
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography color="text.secondary" variant="body2">Type</Typography>
                      <Typography>{parkingLotQuery.data.type}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography color="text.secondary" variant="body2">City</Typography>
                      <Typography>{parkingLotQuery.data.city || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography color="text.secondary" variant="body2">State</Typography>
                      <Typography>{parkingLotQuery.data.state || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography color="text.secondary" variant="body2">Address</Typography>
                      <Typography>{parkingLotQuery.data.address || '-'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          ) : null}

          {activeTab === 'floors' ? (
            <FloorsSection
              floors={floors}
              onCreate={openCreateFloorForm}
              onDelete={setDeleteFloorTarget}
              onEdit={openEditFloorForm}
            />
          ) : null}

          {activeTab === 'slots' ? (
            <SlotsSection
              floors={floors}
              floorNameById={floorNameById}
              filteredSlots={filteredSlots}
              onBulkCreate={openBulkForm}
              onCreate={openCreateSlotForm}
              onDelete={setDeleteSlotTarget}
              onBulkDelete={() => setBulkDeleteOpen(true)}
              onFloorFilterChange={setSlotFloorFilter}
              onSelectionChange={setSlotSelection}
              onStatusChange={(slotId, status) => updateStatusMutation.mutate({ slotId, status })}
              onStatusFilterChange={setSlotStatusFilter}
              onTypeFilterChange={setSlotTypeFilter}
              selectedSlotIds={selectedSlotIds}
              slotFloorFilter={slotFloorFilter}
              filteredSlotIds={filteredSlotIds}
              slotStatusFilter={slotStatusFilter}
              slotTypeFilter={slotTypeFilter}
            />
          ) : null}
        </>
      ) : null}

      <Dialog fullWidth maxWidth="sm" onClose={closeFloorForm} open={floorFormOpen}>
        <Box component="form" onSubmit={handleFloorSubmit}>
          <DialogTitle>{editingFloor ? 'Edit Floor' : 'Create Floor'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                onChange={(event) => setFloorForm((current) => ({ ...current, name: event.target.value }))}
                required
                value={floorForm.name}
              />
              <TextField
                label="Level"
                onChange={(event) => setFloorForm((current) => ({ ...current, level: Number(event.target.value) }))}
                type="number"
                value={floorForm.level ?? 0}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeFloorForm}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingFloor ? 'Save Changes' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => setSlotFormOpen(false)} open={slotFormOpen}>
        <Box component="form" onSubmit={handleCreateSlotSubmit}>
          <DialogTitle>Create Slot</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FloorSelect
                floors={floors}
                label="Floor"
                onChange={(floorId) => setSlotForm((current) => ({ ...current, floorId }))}
                value={slotForm.floorId}
              />
              <TextField
                label="Slot Number"
                onChange={(event) => setSlotForm((current) => ({ ...current, slotNumber: event.target.value }))}
                required
                value={slotForm.slotNumber}
              />
              <SlotTypeSelect
                value={slotForm.slotType ?? 'CAR'}
                onChange={(slotType) => setSlotForm((current) => ({ ...current, slotType }))}
              />
              <SlotStatusSelect
                value={slotForm.status ?? 'AVAILABLE'}
                onChange={(status) => setSlotForm((current) => ({ ...current, status }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSlotFormOpen(false)}>Cancel</Button>
            <Button disabled={createSlotMutation.isPending} type="submit" variant="contained">
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => setBulkFormOpen(false)} open={bulkFormOpen}>
        <Box component="form" onSubmit={handleBulkSubmit}>
          <DialogTitle>Bulk Create Slots</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FloorSelect
                floors={floors}
                label="Floor"
                onChange={(floorId) => setBulkForm((current) => ({ ...current, floorId: Number(floorId) }))}
                value={bulkForm.floorId || ''}
              />
              <TextField
                label="Prefix"
                onChange={(event) => setBulkForm((current) => ({ ...current, prefix: event.target.value }))}
                required
                value={bulkForm.prefix}
              />
              <TextField
                label="Start Number"
                onChange={(event) => setBulkForm((current) => ({ ...current, startNumber: Number(event.target.value) }))}
                required
                type="number"
                value={bulkForm.startNumber}
              />
              <TextField
                label="Count"
                onChange={(event) => setBulkForm((current) => ({ ...current, count: Number(event.target.value) }))}
                required
                type="number"
                value={bulkForm.count}
              />
              <SlotTypeSelect
                value={bulkForm.slotType}
                onChange={(slotType) => setBulkForm((current) => ({ ...current, slotType }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkFormOpen(false)}>Cancel</Button>
            <Button disabled={bulkSlotMutation.isPending} type="submit" variant="contained">
              Create Slots
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Delete"
        description={deleteFloorTarget ? `Delete ${deleteFloorTarget.name}?` : ''}
        isLoading={deleteFloorMutation.isPending}
        onClose={() => setDeleteFloorTarget(null)}
        onConfirm={() => {
          if (deleteFloorTarget) {
            deleteFloorMutation.mutate(deleteFloorTarget.id);
          }
        }}
        open={Boolean(deleteFloorTarget)}
        title="Delete Floor"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={deleteSlotTarget ? `Delete slot ${deleteSlotTarget.slotNumber}?` : ''}
        isLoading={deleteSlotMutation.isPending}
        onClose={() => setDeleteSlotTarget(null)}
        onConfirm={() => {
          if (deleteSlotTarget) {
            deleteSlotMutation.mutate(deleteSlotTarget.id);
          }
        }}
        open={Boolean(deleteSlotTarget)}
        title="Delete Slot"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={`Delete ${selectedSlotIds.length} selected slots?`}
        isLoading={bulkDeleteSlotsMutation.isPending}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteSlotsMutation.mutate(selectedSlotIds)}
        open={bulkDeleteOpen}
        title="Bulk Delete Slots"
      />

      <Snackbar autoHideDuration={3500} onClose={() => setSnackbar(null)} open={Boolean(snackbar)}>
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity ?? 'success'} variant="filled">
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

function FloorsSection({
  floors,
  onCreate,
  onDelete,
  onEdit,
}: {
  floors: Floor[];
  onCreate: () => void;
  onDelete: (floor: Floor) => void;
  onEdit: (floor: Floor) => void;
}) {
  const columns = useMemo<GridColDef<Floor>[]>(
    () => [
      { field: 'name', flex: 1, headerName: 'Name', minWidth: 180 },
      { field: 'level', headerName: 'Level', minWidth: 120 },
      {
        field: 'actions',
        align: 'right',
        filterable: false,
        headerAlign: 'right',
        headerName: 'Actions',
        minWidth: 140,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" justifyContent="flex-end" width="100%">
            <Tooltip title="Edit">
              <IconButton onClick={() => onEdit(row)}>
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => onDelete(row)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [onDelete, onEdit],
  );

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" p={2}>
        <Typography fontWeight={700}>Floors</Typography>
        <Button onClick={onCreate} startIcon={<Add />} variant="contained">
          Create Floor
        </Button>
      </Stack>
      <AppDataGrid columns={columns} height={420} rows={floors} />
    </Paper>
  );
}

function SlotsSection({
  filteredSlots,
  filteredSlotIds,
  floorNameById,
  floors,
  onBulkCreate,
  onBulkDelete,
  onCreate,
  onDelete,
  onFloorFilterChange,
  onSelectionChange,
  onStatusChange,
  onStatusFilterChange,
  onTypeFilterChange,
  selectedSlotIds,
  slotFloorFilter,
  slotStatusFilter,
  slotTypeFilter,
}: {
  filteredSlots: Slot[];
  filteredSlotIds: number[];
  floorNameById: Map<number, string>;
  floors: Floor[];
  onBulkCreate: () => void;
  onBulkDelete: () => void;
  onCreate: () => void;
  onDelete: (slot: Slot) => void;
  onFloorFilterChange: (floorId: number | 'ALL') => void;
  onSelectionChange: (ids: GridRowId[]) => void;
  onStatusChange: (slotId: number, status: SlotStatus) => void;
  onStatusFilterChange: (status: SlotStatus | 'ALL') => void;
  onTypeFilterChange: (slotType: SlotType | 'ALL') => void;
  selectedSlotIds: number[];
  slotFloorFilter: number | 'ALL';
  slotStatusFilter: SlotStatus | 'ALL';
  slotTypeFilter: SlotType | 'ALL';
}) {
  const columns = useMemo<GridColDef<Slot>[]>(
    () => [
      { field: 'slotNumber', headerName: 'Slot', minWidth: 130 },
      {
        field: 'floorId',
        flex: 1,
        headerName: 'Floor',
        minWidth: 160,
        valueGetter: (_value, row) => floorNameById.get(row.floorId) ?? `Floor #${row.floorId}`,
      },
      { field: 'slotType', headerName: 'Type', minWidth: 140 },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 150,
        renderCell: ({ row }) => <SlotStatusChip status={row.status} />,
      },
      {
        field: 'actions',
        align: 'right',
        filterable: false,
        headerAlign: 'right',
        headerName: 'Actions',
        minWidth: 240,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" justifyContent="flex-end" spacing={1} width="100%">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                onChange={(event) => onStatusChange(row.id, event.target.value as SlotStatus)}
                value={row.status}
              >
                {slotStatusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    <SlotStatusChip status={status} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => onDelete(row)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [floorNameById, onDelete, onStatusChange],
  );

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} p={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Floor</InputLabel>
            <Select
              label="Floor"
              onChange={(event) =>
                onFloorFilterChange(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))
              }
              value={slotFloorFilter}
            >
              <MenuItem value="ALL">All Floors</MenuItem>
              {floors.map((floor) => (
                <MenuItem key={floor.id} value={floor.id}>
                  {floor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              onChange={(event) => onStatusFilterChange(event.target.value as SlotStatus | 'ALL')}
              value={slotStatusFilter}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              {slotStatusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  <SlotStatusChip status={status} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              onChange={(event) => onTypeFilterChange(event.target.value as SlotType | 'ALL')}
              value={slotTypeFilter}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              {slotTypeOptions.map((slotType) => (
                <MenuItem key={slotType} value={slotType}>
                  {slotType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            color="error"
            disabled={selectedSlotIds.length === 0}
            onClick={onBulkDelete}
            variant="outlined"
          >
            Delete Selected
          </Button>
          <Button disabled={floors.length === 0} onClick={onCreate} startIcon={<Add />} variant="contained">
            Create Slot
          </Button>
          <Button disabled={floors.length === 0} onClick={onBulkCreate} variant="outlined">
            Bulk Create
          </Button>
        </Stack>
      </Stack>
      <AppDataGrid
        checkboxSelection
        columns={columns}
        height={520}
        onRowSelectionModelChange={onSelectionChange}
        rowSelectionModel={selectedSlotIds}
        rows={filteredSlots}
      />
    </Paper>
  );
}

function FloorSelect({
  floors,
  label,
  onChange,
  value,
}: {
  floors: Floor[];
  label: string;
  onChange: (floorId: number | '') => void;
  value: number | '';
}) {
  return (
    <FormControl required>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        value={value}
      >
        {floors.map((floor) => (
          <MenuItem key={floor.id} value={floor.id}>
            {floor.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function SlotTypeSelect({
  onChange,
  value,
}: {
  onChange: (slotType: SlotType) => void;
  value: SlotType;
}) {
  return (
    <FormControl>
      <InputLabel>Slot Type</InputLabel>
      <Select label="Slot Type" onChange={(event) => onChange(event.target.value as SlotType)} value={value}>
        {slotTypeOptions.map((slotType) => (
          <MenuItem key={slotType} value={slotType}>
            {slotType}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function SlotStatusSelect({
  onChange,
  value,
}: {
  onChange: (status: SlotStatus) => void;
  value: SlotStatus;
}) {
  return (
    <FormControl>
      <InputLabel>Status</InputLabel>
      <Select label="Status" onChange={(event) => onChange(event.target.value as SlotStatus)} value={value}>
        {slotStatusOptions.map((status) => (
          <MenuItem key={status} value={status}>
            <SlotStatusChip status={status} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
