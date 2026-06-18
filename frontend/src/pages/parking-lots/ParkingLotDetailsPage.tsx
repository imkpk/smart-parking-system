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
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Add, Delete, Edit, Layers, LocalParking, ViewModule } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GridColDef, GridRowId } from '@mui/x-data-grid';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
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
import type { IllustrationName } from '../../assets/illustrations';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailsDialog, DetailsRow } from '../../components/common/DetailsDialog';
import {
  ActionButtonGroup,
  HeaderActionButton,
  PageHeader,
  ToolbarButton,
} from '../../components/common/PageHeader';

import { createDetailsColumn } from '../../components/common/gridColumns';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { SlotStatusChip } from '../../components/common/SlotStatusChip';
import { StatCard } from '../../components/common/StatCard';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { formatStatusLabel } from '../../lib/formatters';
import { filterFloors, filterSlots } from '../../lib/searchFilters';
import { isSlotStatus } from '../../lib/slotStatusNavigation';
import { statusStyles } from '../../lib/statusStyles';
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

function buildFloorSummaryRows(
  floor: Floor,
  parkingLotName: string,
  totalSlots?: number,
): DetailsRow[] {
  const rows: DetailsRow[] = [
    { label: 'Floor Name', value: floor.name },
    { label: 'Floor Number', value: floor.level ?? '-' },
    { label: 'Parking Lot', value: parkingLotName },
  ];

  if (totalSlots !== undefined) {
    rows.push({ label: 'Total Slots', value: totalSlots });
  }

  return rows;
}

function buildFloorTechnicalRows(floor: Floor): DetailsRow[] {
  return [
    { label: 'floorId', value: floor.id },
    { label: 'parkingLotId', value: floor.parkingLotId },
  ];
}

function buildSlotSummaryRows(
  slot: Slot,
  floorName: string,
  parkingLotName: string,
): DetailsRow[] {
  return [
    { label: 'Slot Number', value: slot.slotNumber },
    { label: 'Floor', value: floorName },
    { label: 'Parking Lot', value: parkingLotName },
    { label: 'Vehicle Type', value: formatStatusLabel(slot.slotType) },
    { label: 'Status', value: <SlotStatusChip status={slot.status} /> },
  ];
}

function buildSlotTechnicalRows(slot: Slot, parkingLotId: number): DetailsRow[] {
  return [
    { label: 'slotId', value: slot.id },
    { label: 'floorId', value: slot.floorId },
    { label: 'parkingLotId', value: parkingLotId },
    { label: 'status', value: slot.status },
    { label: 'vehicleType', value: slot.slotType },
  ];
}

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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
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
  const [slotStatusFilter, setSlotStatusFilter] = useState<SlotStatus | 'ALL'>(() => {
    const statusParam = searchParams.get('status');
    return isSlotStatus(statusParam) ? statusParam : 'ALL';
  });
  const [slotTypeFilter, setSlotTypeFilter] = useState<SlotType | 'ALL'>('ALL');
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<Slot | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    const statusParam = searchParams.get('status');

    if (isSlotStatus(statusParam)) {
      setSlotStatusFilter(statusParam);
    }
  }, [searchParams]);

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
  const parkingLotName = parkingLotQuery.data?.name ?? `Lot #${parkingLotId}`;
  const filteredSlots = useMemo(() => {
    const dropdownFiltered = slots.filter((slot) => {
      const floorMatches = slotFloorFilter === 'ALL' || slot.floorId === slotFloorFilter;
      const statusMatches = slotStatusFilter === 'ALL' || slot.status === slotStatusFilter;
      const typeMatches = slotTypeFilter === 'ALL' || slot.slotType === slotTypeFilter;
      return floorMatches && statusMatches && typeMatches;
    });

    return filterSlots(dropdownFiltered, slotSearch, floorNameById, parkingLotName);
  }, [
    floorNameById,
    parkingLotName,
    slotFloorFilter,
    slotSearch,
    slotStatusFilter,
    slotTypeFilter,
    slots,
  ]);
  const hasSlotFilters =
    slotSearch.trim().length > 0 ||
    slotFloorFilter !== 'ALL' ||
    slotStatusFilter !== 'ALL' ||
    slotTypeFilter !== 'ALL';
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
  const slotCountByFloorId = useMemo(() => {
    const counts = new Map<number, number>();

    for (const slot of slots) {
      counts.set(slot.floorId, (counts.get(slot.floorId) ?? 0) + 1);
    }

    return counts;
  }, [slots]);

  const invalidateStructure = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parking-lots', parkingLotId, 'floors'] }),
      queryClient.invalidateQueries({ queryKey: ['parking-lots', parkingLotId, 'slots'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const floorMutationOptions = {
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error));
    },
  };

  const createFloorMutation = useMutation({
    mutationFn: (payload: FloorPayload) => createFloor(parkingLotId, payload),
    onSuccess: async () => {
      await invalidateStructure();
      showSuccess('Floor created.');
      closeFloorForm();
    },
    ...floorMutationOptions,
  });
  const updateFloorMutation = useMutation({
    mutationFn: ({ floorId, payload }: { floorId: number; payload: FloorPayload }) =>
      updateFloor(floorId, payload),
    onSuccess: async () => {
      await invalidateStructure();
      showSuccess('Floor updated.');
      closeFloorForm();
    },
    ...floorMutationOptions,
  });
  const deleteFloorMutation = useMutation({
    mutationFn: deleteFloor,
    onSuccess: async () => {
      await invalidateStructure();
      showSuccess('Floor deleted.');
      setDeleteFloorTarget(null);
    },
    ...floorMutationOptions,
  });
  const createSlotMutation = useMutation({
    mutationFn: ({ floorId, payload }: { floorId: number; payload: SlotPayload }) =>
      createSlot(floorId, payload),
    onSuccess: async () => {
      await invalidateStructure();
      showSuccess('Slot created.');
      setSlotFormOpen(false);
      setSlotForm(emptySlotForm);
    },
    onError: (error) => showError(getApiErrorMessage(error)),
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
      showSuccess(`${variables.count} slots created.`);
      setBulkFormOpen(false);
      setBulkForm({ ...emptyBulkForm, floorId: floors[0]?.id ?? 0 });
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ slotId, status }: { slotId: number; status: SlotStatus }) =>
      updateSlotStatus(slotId, status),
    onSuccess: async () => {
      await invalidateStructure();
      showSuccess('Slot status updated.');
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });
  const deleteSlotMutation = useMutation({
    mutationFn: deleteSlot,
    onSuccess: async (_deletedSlot, slotId) => {
      await invalidateStructure();
      setSelectedSlotIds((current) => current.filter((id) => id !== slotId));
      setDeleteSlotTarget(null);
      showSuccess('Slot deleted.');
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });
  const bulkDeleteSlotsMutation = useMutation({
    mutationFn: deleteSlots,
    onSuccess: async (_result, ids) => {
      await invalidateStructure();
      setSelectedSlotIds((current) => current.filter((id) => !ids.includes(id)));
      setBulkDeleteOpen(false);
      showSuccess(`${ids.length} slots deleted.`);
    },
    onError: (error) => showError(getApiErrorMessage(error)),
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
      showError('Please select a floor.');
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
      showError('Please select a floor and valid slot count.');
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
        title={parkingLotQuery.data?.name ?? 'Parking Lot'}
        action={
          <ActionButtonGroup>
            {parkingLotId ? (
              <HeaderActionButton
                component={RouterLink}
                startIcon={<ViewModule />}
                to={`/parking-lots/${parkingLotId}/slot-map`}
                variant="outlined"
              >
                Visual map
              </HeaderActionButton>
            ) : null}
            <HeaderActionButton component={RouterLink} to="/parking-lots" variant="outlined">
              Back
            </HeaderActionButton>
          </ActionButtonGroup>
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
                  accentColor={statusStyles.AVAILABLE.borderColor}
                  icon={<LocalParking />}
                  iconBgcolor={statusStyles.AVAILABLE.bgcolor}
                  label="Available"
                  value={slotStatusCounts.AVAILABLE}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  accentColor={statusStyles.OCCUPIED.borderColor}
                  iconBgcolor={statusStyles.OCCUPIED.bgcolor}
                  label="Occupied"
                  value={slotStatusCounts.OCCUPIED}
                />
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
                  <Typography mb={2} variant="subtitle1">
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
              parkingLotName={parkingLotName}
              slotCountByFloorId={slotCountByFloorId}
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
              parkingLotId={parkingLotId}
              parkingLotName={parkingLotName}
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
              hasSlotFilters={hasSlotFilters}
              onSlotSearchChange={setSlotSearch}
              slotSearch={slotSearch}
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

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}

function FloorsSection({
  floors,
  parkingLotName,
  slotCountByFloorId,
  onCreate,
  onDelete,
  onEdit,
}: {
  floors: Floor[];
  parkingLotName: string;
  slotCountByFloorId: Map<number, number>;
  onCreate: () => void;
  onDelete: (floor: Floor) => void;
  onEdit: (floor: Floor) => void;
}) {
  const [detailsFloor, setDetailsFloor] = useState<Floor | null>(null);
  const [floorSearch, setFloorSearch] = useState('');

  const filteredFloors = useMemo(
    () => filterFloors(floors, floorSearch, parkingLotName),
    [floorSearch, floors, parkingLotName],
  );

  const columns = useMemo<GridColDef<Floor>[]>(
    () => [
      { field: 'name', flex: 1, headerName: 'Floor Name', minWidth: 180 },
      { field: 'level', headerName: 'Floor Number', minWidth: 120 },
      createDetailsColumn<Floor>(setDetailsFloor),
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
      <Stack alignItems="center" direction="row" justifyContent="space-between" p={2} spacing={2}>
        <Typography variant="subtitle1">Floors</Typography>
        <HeaderActionButton onClick={onCreate} startIcon={<Add />} sx={{ width: 'auto' }}>
          Create Floor
        </HeaderActionButton>
      </Stack>
      <AppDataGrid
        columns={columns}
        emptyState={{
          description: floorSearch
            ? 'Try a floor name or floor number.'
            : 'Create a floor to start adding slots.',
          illustration: floorSearch ? 'empty' : 'locationSearch',
          title: floorSearch ? 'No matching floors' : 'No floors found',
        }}
        rows={filteredFloors}
        search={{
          onChange: (event) => setFloorSearch(event.target.value),
          onClear: () => setFloorSearch(''),
          placeholder: 'Search by floor name or floor number',
          value: floorSearch,
        }}
      />
      <DetailsDialog
        onClose={() => setDetailsFloor(null)}
        open={Boolean(detailsFloor)}
        summaryRows={
          detailsFloor
            ? buildFloorSummaryRows(
                detailsFloor,
                parkingLotName,
                slotCountByFloorId.get(detailsFloor.id),
              )
            : []
        }
        technicalRows={detailsFloor ? buildFloorTechnicalRows(detailsFloor) : []}
        title="Floor Details"
      />
    </Paper>
  );
}

function SlotsSection({
  filteredSlots,
  filteredSlotIds,
  floorNameById,
  floors,
  hasSlotFilters,
  parkingLotId,
  parkingLotName,
  onBulkCreate,
  onBulkDelete,
  onCreate,
  onDelete,
  onFloorFilterChange,
  onSelectionChange,
  onSlotSearchChange,
  onStatusChange,
  onStatusFilterChange,
  onTypeFilterChange,
  selectedSlotIds,
  slotFloorFilter,
  slotSearch,
  slotStatusFilter,
  slotTypeFilter,
}: {
  filteredSlots: Slot[];
  filteredSlotIds: number[];
  floorNameById: Map<number, string>;
  floors: Floor[];
  hasSlotFilters: boolean;
  parkingLotId: number;
  parkingLotName: string;
  onBulkCreate: () => void;
  onBulkDelete: () => void;
  onCreate: () => void;
  onDelete: (slot: Slot) => void;
  onFloorFilterChange: (floorId: number | 'ALL') => void;
  onSelectionChange: (ids: GridRowId[]) => void;
  onSlotSearchChange: (value: string) => void;
  onStatusChange: (slotId: number, status: SlotStatus) => void;
  onStatusFilterChange: (status: SlotStatus | 'ALL') => void;
  onTypeFilterChange: (slotType: SlotType | 'ALL') => void;
  selectedSlotIds: number[];
  slotFloorFilter: number | 'ALL';
  slotSearch: string;
  slotStatusFilter: SlotStatus | 'ALL';
  slotTypeFilter: SlotType | 'ALL';
}) {
  const [detailsSlot, setDetailsSlot] = useState<Slot | null>(null);

  const columns = useMemo<GridColDef<Slot>[]>(
    () => [
      { field: 'slotNumber', headerName: 'Slot Number', minWidth: 130 },
      {
        field: 'floorId',
        flex: 1,
        headerName: 'Floor',
        minWidth: 160,
        valueGetter: (_value, row) => floorNameById.get(row.floorId) ?? `Floor #${row.floorId}`,
      },
      { field: 'slotType', headerName: 'Vehicle Type', minWidth: 140 },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 150,
        renderCell: ({ row }) => <SlotStatusChip status={row.status} />,
      },
      createDetailsColumn<Slot>(setDetailsSlot),
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

  const slotEmptyState: {
    description: string;
    illustration: IllustrationName;
    title: string;
  } = hasSlotFilters
    ? {
        description: 'Try a slot number, floor, status, or vehicle type.',
        illustration: 'empty',
        title: 'No matching slots',
      }
    : {
        description: 'Create slots on a floor to manage parking capacity.',
        illustration: 'heatmap',
        title: 'No slots found',
      };

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Stack spacing={2} p={2}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            width: '100%',
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel id="slot-floor-filter-label">Floor</InputLabel>
            <Select
              label="Floor"
              labelId="slot-floor-filter-label"
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
          <FormControl fullWidth size="small">
            <InputLabel id="slot-status-filter-label">Status</InputLabel>
            <Select
              label="Status"
              labelId="slot-status-filter-label"
              onChange={(event) => onStatusFilterChange(event.target.value as SlotStatus | 'ALL')}
              renderValue={(value) =>
                value === 'ALL' ? 'All Statuses' : formatStatusLabel(value as SlotStatus)
              }
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
          <FormControl fullWidth size="small">
            <InputLabel id="slot-type-filter-label">Type</InputLabel>
            <Select
              label="Type"
              labelId="slot-type-filter-label"
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
        </Box>
        <ActionButtonGroup>
          <ToolbarButton
            color="error"
            disabled={selectedSlotIds.length === 0}
            onClick={onBulkDelete}
            variant="outlined"
          >
            Delete Selected
          </ToolbarButton>
          <ToolbarButton
            disabled={floors.length === 0}
            onClick={onCreate}
            startIcon={<Add />}
            variant="contained"
          >
            Create Slot
          </ToolbarButton>
          <ToolbarButton
            disabled={floors.length === 0}
            onClick={onBulkCreate}
            variant="outlined"
          >
            Bulk Create
          </ToolbarButton>
        </ActionButtonGroup>
      </Stack>
      <AppDataGrid
        checkboxSelection
        columns={columns}
        emptyState={slotEmptyState}
        onRowSelectionModelChange={onSelectionChange}
        rowSelectionModel={selectedSlotIds}
        rows={filteredSlots}
        search={{
          onChange: (event) => onSlotSearchChange(event.target.value),
          onClear: () => onSlotSearchChange(''),
          placeholder: 'Search by slot number, floor, status, or vehicle type',
          value: slotSearch,
        }}
      />
      <DetailsDialog
        onClose={() => setDetailsSlot(null)}
        open={Boolean(detailsSlot)}
        summaryRows={
          detailsSlot
            ? buildSlotSummaryRows(
                detailsSlot,
                floorNameById.get(detailsSlot.floorId) ?? `Floor #${detailsSlot.floorId}`,
                parkingLotName,
              )
            : []
        }
        technicalRows={
          detailsSlot ? buildSlotTechnicalRows(detailsSlot, parkingLotId) : []
        }
        title="Slot Details"
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
        onChange={(event) => {
          const nextValue = event.target.value as number | '';
          onChange(nextValue === '' ? '' : Number(nextValue));
        }}
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
