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
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Add, Delete, Edit, Sensors, SettingsInputAntenna } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GridColDef } from '@mui/x-data-grid';
import { FormEvent, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  createGate,
  deleteGate,
  getGateLiveStatus,
  getGatesByParkingLot,
  updateGate,
} from '../../api/iotGatesApi';
import { getParkingLot } from '../../api/parkingLotsApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailsDialog, DetailsRow } from '../../components/common/DetailsDialog';
import { StatCard } from '../../components/common/StatCard';
import { StatusChip } from '../../components/common/StatusChip';
import { ToolbarButton } from '../../components/common/PageHeader';
import { createDetailsColumn } from '../../components/common/gridColumns';
import { IotDeviceStatusChip } from '../../components/iot/IotDeviceStatusChip';
import { ParkingLotWorkspaceShell } from '../../components/parking-lots/ParkingLotWorkspaceShell';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { formatDateTime, formatStatusLabel } from '../../lib/formatters';
import { PARKING_LOT_QUERY_STALE_MS } from '../../lib/parkingLotQueryOptions';
import { resolveParkingLotWorkspaceTab } from '../../lib/parkingLotWorkspace';
import { statusStyles } from '../../lib/statusStyles';
import {
  Gate,
  GateDirection,
  GatePayload,
  gateDirectionOptions,
  IotDevice,
} from '../../types/iot';

const emptyGateForm: GatePayload = {
  externalId: '',
  name: '',
  direction: 'ENTRY',
  isActive: true,
  autoOpenEnabled: true,
  anprConfidenceThreshold: 0.85,
  duplicateWindowSeconds: 30,
  commandTtlSeconds: 15,
};

function buildGateSummaryRows(gate: Gate, parkingLotName: string): DetailsRow[] {
  return [
    { label: 'Gate Name', value: gate.name },
    { label: 'External ID', value: gate.externalId },
    { label: 'Direction', value: formatStatusLabel(gate.direction) },
    { label: 'Parking Lot', value: parkingLotName },
    { label: 'Status', value: <StatusChip status={gate.isActive ? 'ACTIVE' : 'DISABLED'} /> },
    { label: 'Auto Open', value: gate.autoOpenEnabled ? 'Enabled' : 'Disabled' },
  ];
}

function buildGateTechnicalRows(gate: Gate): DetailsRow[] {
  return [
    { label: 'gateId', value: gate.id },
    { label: 'parkingLotId', value: gate.parkingLotId },
    { label: 'anprConfidenceThreshold', value: gate.anprConfidenceThreshold },
    { label: 'duplicateWindowSeconds', value: gate.duplicateWindowSeconds },
    { label: 'commandTtlSeconds', value: gate.commandTtlSeconds },
  ];
}

function DeviceHealthList({ devices }: { devices: IotDevice[] }) {
  if (devices.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        No devices registered for this gate.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {devices.map((device) => (
        <Box
          key={device.id}
          sx={{
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'space-between',
            px: 1.5,
            py: 1,
          }}
        >
          <Stack spacing={0.25}>
            <Typography fontWeight={600} variant="body2">
              {device.name}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {formatStatusLabel(device.deviceType)} · {device.externalDeviceId}
            </Typography>
          </Stack>
          <Stack alignItems="flex-end" spacing={0.25}>
            <IotDeviceStatusChip status={device.status} />
            <Typography color="text.secondary" variant="caption">
              Last seen: {formatDateTime(device.lastSeenAt)}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export function ParkingLotGatesPage() {
  const { id } = useParams();
  const location = useLocation();
  const parkingLotId = Number(id);
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const { isOperationalAdmin, isTenantAdmin } = useUserRole();
  const canManageLot = isOperationalAdmin || isTenantAdmin;
  const activeTab = resolveParkingLotWorkspaceTab(location.pathname, null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
  const [gateForm, setGateForm] = useState<GatePayload>(emptyGateForm);
  const [deleteTarget, setDeleteTarget] = useState<Gate | null>(null);
  const [detailsGate, setDetailsGate] = useState<Gate | null>(null);
  const [healthGateId, setHealthGateId] = useState<number | null>(null);
  const [gateSearch, setGateSearch] = useState('');

  const parkingLotQuery = useQuery({
    queryKey: ['parking-lots', parkingLotId],
    queryFn: () => getParkingLot(parkingLotId),
    enabled: Number.isFinite(parkingLotId),
    staleTime: PARKING_LOT_QUERY_STALE_MS,
  });

  const gatesQuery = useQuery({
    queryKey: ['parking-lots', parkingLotId, 'gates'],
    queryFn: () => getGatesByParkingLot(parkingLotId),
    enabled: Number.isFinite(parkingLotId),
    staleTime: PARKING_LOT_QUERY_STALE_MS,
    refetchInterval: 10_000,
  });

  const gateHealthQuery = useQuery({
    queryKey: ['gates', healthGateId, 'live'],
    queryFn: () => getGateLiveStatus(healthGateId as number),
    enabled: healthGateId != null,
    refetchInterval: 5_000,
  });

  const gates = gatesQuery.data ?? [];
  const parkingLotName = parkingLotQuery.data?.name ?? `Lot #${parkingLotId}`;

  const filteredGates = useMemo(() => {
    const normalized = gateSearch.trim().toLowerCase();

    if (!normalized) {
      return gates;
    }

    return gates.filter((gate) =>
      [gate.name, gate.externalId, gate.direction]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [gateSearch, gates]);

  const invalidateGates = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parking-lots', parkingLotId, 'gates'] }),
      queryClient.invalidateQueries({ queryKey: ['gates'] }),
    ]);
  };

  const gateMutationOptions = {
    onError: (error: unknown) => showError(getApiErrorMessage(error)),
  };

  const createGateMutation = useMutation({
    mutationFn: (payload: GatePayload) => createGate(parkingLotId, payload),
    onSuccess: async () => {
      await invalidateGates();
      showSuccess('Gate created.');
      closeForm();
    },
    ...gateMutationOptions,
  });

  const updateGateMutation = useMutation({
    mutationFn: ({ gateId, payload }: { gateId: number; payload: Partial<GatePayload> }) =>
      updateGate(gateId, payload),
    onSuccess: async () => {
      await invalidateGates();
      showSuccess('Gate updated.');
      closeForm();
    },
    ...gateMutationOptions,
  });

  const deleteGateMutation = useMutation({
    mutationFn: deleteGate,
    onSuccess: async (_deletedGate, gateId) => {
      await invalidateGates();
      showSuccess('Gate deleted.');
      if (healthGateId === gateId) {
        setHealthGateId(null);
      }
      setDeleteTarget(null);
    },
    ...gateMutationOptions,
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditingGate(null);
    setGateForm(emptyGateForm);
  };

  const openCreateForm = () => {
    setEditingGate(null);
    setGateForm(emptyGateForm);
    setFormOpen(true);
  };

  const openEditForm = (gate: Gate) => {
    setEditingGate(gate);
    setGateForm({
      externalId: gate.externalId,
      name: gate.name,
      direction: gate.direction,
      isActive: gate.isActive,
      autoOpenEnabled: gate.autoOpenEnabled,
      anprConfidenceThreshold: gate.anprConfidenceThreshold,
      duplicateWindowSeconds: gate.duplicateWindowSeconds,
      commandTtlSeconds: gate.commandTtlSeconds,
    });
    setFormOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: GatePayload = {
      ...gateForm,
      externalId: gateForm.externalId.trim(),
      name: gateForm.name.trim(),
    };

    if (!payload.externalId || !payload.name) {
      showError('External ID and name are required.');
      return;
    }

    if (editingGate) {
      updateGateMutation.mutate({ gateId: editingGate.id, payload });
      return;
    }

    createGateMutation.mutate(payload);
  };

  const columns = useMemo<GridColDef<Gate>[]>(
    () => [
      {
        field: 'name',
        flex: 1,
        headerName: 'Gate Name',
        minWidth: 160,
      },
      {
        field: 'externalId',
        headerName: 'External ID',
        minWidth: 140,
      },
      {
        field: 'direction',
        headerName: 'Direction',
        minWidth: 130,
        valueFormatter: (value) => formatStatusLabel(String(value)),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 120,
        renderCell: ({ row }) => (
          <StatusChip status={row.isActive ? 'ACTIVE' : 'DISABLED'} />
        ),
      },
      {
        field: 'autoOpenEnabled',
        headerName: 'Auto Open',
        minWidth: 110,
        valueFormatter: (value) => (value ? 'Yes' : 'No'),
      },
      createDetailsColumn<Gate>(setDetailsGate),
      ...(canManageLot
        ? [
            {
              field: 'actions',
              align: 'right' as const,
              filterable: false,
              headerAlign: 'right' as const,
              headerName: 'Actions',
              minWidth: 180,
              sortable: false,
              renderCell: ({ row }: { row: Gate }) => (
                <Stack direction="row" justifyContent="flex-end" spacing={0.5} width="100%">
                  <Tooltip title="Device health">
                    <IconButton
                      aria-label={`View device health for ${row.name}`}
                      onClick={() => setHealthGateId(row.id)}
                    >
                      <Sensors />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton aria-label={`Edit ${row.name}`} onClick={() => openEditForm(row)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      aria-label={`Delete ${row.name}`}
                      color="error"
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            },
          ]
        : []),
    ],
    [canManageLot],
  );

  const firstError = parkingLotQuery.error ?? gatesQuery.error;
  const isLoading =
    (parkingLotQuery.isPending && !parkingLotQuery.data) ||
    (gatesQuery.isPending && !gatesQuery.data);

  return (
    <Stack spacing={3}>
      {isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {firstError ? (
        <Alert severity={isForbiddenError(firstError) ? 'warning' : 'error'}>
          {isForbiddenError(firstError)
            ? 'Access denied. Admin role is required.'
            : getApiErrorMessage(firstError, 'Could not load parking lot gates.')}
        </Alert>
      ) : null}

      {parkingLotQuery.data ? (
        <ParkingLotWorkspaceShell
          activeTab={activeTab}
          canManageLot={canManageLot}
          parkingLot={parkingLotQuery.data}
        >
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} lg={4}>
                <StatCard icon={<SettingsInputAntenna />} label="Gates" value={gates.length} />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  accentColor={statusStyles.ACTIVE.borderColor}
                  iconBgcolor={statusStyles.ACTIVE.bgcolor}
                  label="Active Gates"
                  value={gates.filter((gate) => gate.isActive).length}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  accentColor={statusStyles.ONLINE.borderColor}
                  icon={<Sensors />}
                  iconBgcolor={statusStyles.ONLINE.bgcolor}
                  label="Monitored Devices"
                  value={gateHealthQuery.data?.devicesTotal ?? '—'}
                />
              </Grid>
            </Grid>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Stack alignItems="center" direction="row" justifyContent="space-between" p={2} spacing={2}>
                <Typography variant="subtitle1">IoT Gates</Typography>
                {canManageLot ? (
                  <ToolbarButton onClick={openCreateForm} startIcon={<Add />} sx={{ width: 'auto' }}>
                    Create Gate
                  </ToolbarButton>
                ) : null}
              </Stack>
              <AppDataGrid
                columns={columns}
                emptyState={{
                  description: gateSearch
                    ? 'Try a gate name or external ID.'
                    : 'Create a gate to connect IoT devices and automate access.',
                  illustration: gateSearch ? 'empty' : 'gateEntrance',
                  title: gateSearch ? 'No matching gates' : 'No gates found',
                }}
                loading={gatesQuery.isFetching}
                rows={filteredGates}
                search={{
                  onChange: (event) => setGateSearch(event.target.value),
                  onClear: () => setGateSearch(''),
                  placeholder: 'Search by gate name, external ID, or direction',
                  value: gateSearch,
                }}
              />
            </Paper>

            {healthGateId != null ? (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
                <Stack spacing={2}>
                  <Stack alignItems="center" direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1">
                      Device Health — {gateHealthQuery.data?.gateName ?? `Gate #${healthGateId}`}
                    </Typography>
                    <Button onClick={() => setHealthGateId(null)} size="small" variant="outlined">
                      Close
                    </Button>
                  </Stack>

                  {gateHealthQuery.isLoading ? <CircularProgress size={24} /> : null}
                  {gateHealthQuery.error ? (
                    <Alert severity="error">
                      {getApiErrorMessage(gateHealthQuery.error, 'Could not load device health.')}
                    </Alert>
                  ) : null}

                  {gateHealthQuery.data ? (
                    <Stack spacing={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Typography color="text.secondary" variant="body2">
                            Devices online
                          </Typography>
                          <Typography variant="h6">
                            {gateHealthQuery.data.devicesOnline} / {gateHealthQuery.data.devicesTotal}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography color="text.secondary" variant="body2">
                            Last detection
                          </Typography>
                          <Typography variant="body1">
                            {formatDateTime(gateHealthQuery.data.lastDetectionAt)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography color="text.secondary" variant="body2">
                            Pending commands
                          </Typography>
                          <Typography variant="body1">{gateHealthQuery.data.pendingCommands}</Typography>
                        </Grid>
                      </Grid>
                      <DeviceHealthList devices={gateHealthQuery.data.devices} />
                    </Stack>
                  ) : null}
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </ParkingLotWorkspaceShell>
      ) : null}

      <Dialog fullWidth maxWidth="sm" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingGate ? 'Edit Gate' : 'Create Gate'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                onChange={(event) =>
                  setGateForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                value={gateForm.name}
              />
              <TextField
                helperText="Unique identifier used by edge devices and MQTT topics."
                label="External ID"
                onChange={(event) =>
                  setGateForm((current) => ({ ...current, externalId: event.target.value }))
                }
                required
                value={gateForm.externalId}
              />
              <FormControl required>
                <InputLabel>Direction</InputLabel>
                <Select
                  label="Direction"
                  onChange={(event) =>
                    setGateForm((current) => ({
                      ...current,
                      direction: event.target.value as GateDirection,
                    }))
                  }
                  value={gateForm.direction}
                >
                  {gateDirectionOptions.map((direction) => (
                    <MenuItem key={direction} value={direction}>
                      {formatStatusLabel(direction)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={gateForm.isActive ?? true}
                    onChange={(event) =>
                      setGateForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                  />
                }
                label="Gate active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={gateForm.autoOpenEnabled ?? true}
                    onChange={(event) =>
                      setGateForm((current) => ({
                        ...current,
                        autoOpenEnabled: event.target.checked,
                      }))
                    }
                  />
                }
                label="Auto open on granted access"
              />
              <TextField
                inputProps={{ min: 0, max: 1, step: 0.01 }}
                label="ANPR confidence threshold"
                onChange={(event) =>
                  setGateForm((current) => ({
                    ...current,
                    anprConfidenceThreshold: Number(event.target.value),
                  }))
                }
                type="number"
                value={gateForm.anprConfidenceThreshold ?? 0.85}
              />
              <TextField
                inputProps={{ min: 1 }}
                label="Duplicate window (seconds)"
                onChange={(event) =>
                  setGateForm((current) => ({
                    ...current,
                    duplicateWindowSeconds: Number(event.target.value),
                  }))
                }
                type="number"
                value={gateForm.duplicateWindowSeconds ?? 30}
              />
              <TextField
                inputProps={{ min: 1 }}
                label="Command TTL (seconds)"
                onChange={(event) =>
                  setGateForm((current) => ({
                    ...current,
                    commandTtlSeconds: Number(event.target.value),
                  }))
                }
                type="number"
                value={gateForm.commandTtlSeconds ?? 15}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm}>Cancel</Button>
            <Button
              disabled={createGateMutation.isPending || updateGateMutation.isPending}
              type="submit"
              variant="contained"
            >
              {editingGate ? 'Save Changes' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <DetailsDialog
        onClose={() => setDetailsGate(null)}
        open={Boolean(detailsGate)}
        summaryRows={detailsGate ? buildGateSummaryRows(detailsGate, parkingLotName) : []}
        technicalRows={detailsGate ? buildGateTechnicalRows(detailsGate) : []}
        title="Gate Details"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={deleteTarget ? `Delete gate ${deleteTarget.name}?` : ''}
        isLoading={deleteGateMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteGateMutation.mutate(deleteTarget.id);
          }
        }}
        open={Boolean(deleteTarget)}
        title="Delete Gate"
      />

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}