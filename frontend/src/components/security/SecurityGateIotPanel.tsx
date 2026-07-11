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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MeetingRoom, Sensors } from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getGateAccessAttempts,
  getGateDetections,
  getGateLiveStatus,
  getGatesByParkingLot,
  manualOpenGate,
} from '../../api/iotGatesApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { AppDataGrid } from '../common/AppDataGrid';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { GateAccessDecisionChip } from '../iot/GateAccessDecisionChip';
import { IotDeviceStatusChip } from '../iot/IotDeviceStatusChip';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatDateTime, formatStatusLabel } from '../../lib/formatters';
import { statusStyles } from '../../lib/statusStyles';
import { GateAccessAttempt, GateDetection } from '../../types/iot';

const IOT_POLL_INTERVAL_MS = 3000;

export function SecurityGateIotPanel() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useAppSnackbar();
  const [selectedParkingLotId, setSelectedParkingLotId] = useState<number | ''>('');
  const [selectedGateId, setSelectedGateId] = useState<number | ''>('');
  const [manualOpenOpen, setManualOpenOpen] = useState(false);
  const [manualOpenReason, setManualOpenReason] = useState('');

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
    staleTime: 30_000,
  });

  const gatesQuery = useQuery({
    queryKey: ['parking-lots', selectedParkingLotId, 'gates'],
    queryFn: () => getGatesByParkingLot(Number(selectedParkingLotId)),
    enabled: selectedParkingLotId !== '',
    staleTime: 30_000,
  });

  const liveStatusQuery = useQuery({
    queryKey: ['gates', selectedGateId, 'live'],
    queryFn: () => getGateLiveStatus(Number(selectedGateId)),
    enabled: selectedGateId !== '',
    refetchInterval: IOT_POLL_INTERVAL_MS,
  });

  const detectionsQuery = useQuery({
    queryKey: ['gates', selectedGateId, 'detections'],
    queryFn: () => getGateDetections(Number(selectedGateId), 8),
    enabled: selectedGateId !== '',
    refetchInterval: IOT_POLL_INTERVAL_MS,
  });

  const attemptsQuery = useQuery({
    queryKey: ['gates', selectedGateId, 'access-attempts'],
    queryFn: () => getGateAccessAttempts(Number(selectedGateId), 8),
    enabled: selectedGateId !== '',
    refetchInterval: IOT_POLL_INTERVAL_MS,
  });

  const activeGates = useMemo(
    () => (gatesQuery.data ?? []).filter((gate) => gate.isActive),
    [gatesQuery.data],
  );

  useEffect(() => {
    if (selectedParkingLotId !== '' || !parkingLotsQuery.data?.length) {
      return;
    }

    const firstActiveLot = parkingLotsQuery.data.find((lot) => lot.isActive);

    if (firstActiveLot) {
      setSelectedParkingLotId(firstActiveLot.id);
    }
  }, [parkingLotsQuery.data, selectedParkingLotId]);

  useEffect(() => {
    if (selectedGateId !== '' || activeGates.length === 0) {
      return;
    }

    setSelectedGateId(activeGates[0].id);
  }, [activeGates, selectedGateId]);

  useEffect(() => {
    if (selectedGateId === '') {
      return;
    }

    const gateStillExists = activeGates.some((gate) => gate.id === selectedGateId);

    if (!gateStillExists) {
      setSelectedGateId(activeGates[0]?.id ?? '');
    }
  }, [activeGates, selectedGateId]);

  const manualOpenMutation = useMutation({
    mutationFn: ({ gateId, reason }: { gateId: number; reason: string }) =>
      manualOpenGate(gateId, { reason }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gates', selectedGateId, 'live'] }),
        queryClient.invalidateQueries({ queryKey: ['gates', selectedGateId, 'access-attempts'] }),
      ]);
      setManualOpenOpen(false);
      setManualOpenReason('');
      showSuccess(result.message || 'Manual gate open requested.');
    },
    onError: (error) => showError(getApiErrorMessage(error, 'Could not open gate.')),
  });

  const handleManualOpenSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const reason = manualOpenReason.trim();

    if (!reason) {
      showError('Please enter a reason for manual gate open.');
      return;
    }

    if (selectedGateId === '') {
      return;
    }

    manualOpenMutation.mutate({ gateId: Number(selectedGateId), reason });
  };

  const detectionColumns = useMemo<GridColDef<GateDetection>[]>(
    () => [
      {
        field: 'occurredAt',
        flex: 1,
        headerName: 'Detected At',
        minWidth: 160,
        valueFormatter: (value) => formatDateTime(String(value)),
      },
      {
        field: 'identifierType',
        headerName: 'Type',
        minWidth: 110,
        valueFormatter: (value) => formatStatusLabel(String(value)),
      },
      {
        field: 'identifierDisplay',
        flex: 1,
        headerName: 'Identifier',
        minWidth: 140,
        valueFormatter: (value) => (value ? String(value) : '—'),
      },
      {
        field: 'matchedVehicleNumber',
        headerName: 'Vehicle',
        minWidth: 130,
        valueFormatter: (value) => (value ? String(value) : '—'),
      },
      {
        field: 'deviceName',
        headerName: 'Device',
        minWidth: 130,
      },
    ],
    [],
  );

  const attemptColumns = useMemo<GridColDef<GateAccessAttempt>[]>(
    () => [
      {
        field: 'createdAt',
        flex: 1,
        headerName: 'Attempt At',
        minWidth: 160,
        valueFormatter: (value) => formatDateTime(String(value)),
      },
      {
        field: 'source',
        headerName: 'Source',
        minWidth: 120,
        valueFormatter: (value) => formatStatusLabel(String(value)),
      },
      {
        field: 'decision',
        headerName: 'Decision',
        minWidth: 140,
        renderCell: ({ row }) => <GateAccessDecisionChip decision={row.decision} />,
      },
      {
        field: 'vehicleNumber',
        headerName: 'Vehicle',
        minWidth: 120,
        valueFormatter: (value) => (value ? String(value) : '—'),
      },
      {
        field: 'reasonCode',
        headerName: 'Reason',
        flex: 1,
        minWidth: 140,
      },
    ],
    [],
  );

  const selectedGate = activeGates.find((gate) => gate.id === selectedGateId);
  const isPolling =
    selectedGateId !== '' &&
    (liveStatusQuery.isFetching || detectionsQuery.isFetching || attemptsQuery.isFetching);

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <Stack spacing={2}>
          <Stack alignItems={{ xs: 'stretch', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Typography sx={{ flexShrink: 0 }} variant="subtitle1">
              IoT Gate Monitor
            </Typography>
            {isPolling ? (
              <Typography color="text.secondary" variant="caption">
                Live · refreshes every 3s
              </Typography>
            ) : null}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="iot-parking-lot-label">Parking Lot</InputLabel>
              <Select
                label="Parking Lot"
                labelId="iot-parking-lot-label"
                onChange={(event) => {
                  const nextValue = String(event.target.value);
                  setSelectedParkingLotId(nextValue === '' ? '' : Number(nextValue));
                  setSelectedGateId('');
                }}
                value={selectedParkingLotId}
              >
                {(parkingLotsQuery.data ?? [])
                  .filter((lot) => lot.isActive)
                  .map((lot) => (
                    <MenuItem key={lot.id} value={lot.id}>
                      {lot.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl disabled={activeGates.length === 0} fullWidth size="small">
              <InputLabel id="iot-gate-label">Gate</InputLabel>
              <Select
                label="Gate"
                labelId="iot-gate-label"
                onChange={(event) => {
                  const nextValue = String(event.target.value);
                  setSelectedGateId(nextValue === '' ? '' : Number(nextValue));
                }}
                value={selectedGateId}
              >
                {activeGates.map((gate) => (
                  <MenuItem key={gate.id} value={gate.id}>
                    {gate.name} ({formatStatusLabel(gate.direction)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedParkingLotId !== '' && activeGates.length === 0 ? (
            <Alert severity="info">No active gates configured for this parking lot.</Alert>
          ) : null}
        </Stack>
      </Paper>

      {selectedGateId !== '' ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, 1fr)' },
            }}
          >
            <StatCard
              accentColor={statusStyles.ONLINE.borderColor}
              icon={<Sensors />}
              iconBgcolor={statusStyles.ONLINE.bgcolor}
              label="Devices Online"
              value={
                liveStatusQuery.data
                  ? `${liveStatusQuery.data.devicesOnline}/${liveStatusQuery.data.devicesTotal}`
                  : '—'
              }
            />
            <StatCard
              label="Auto Open"
              value={selectedGate?.autoOpenEnabled ? 'Enabled' : 'Disabled'}
            />
            <StatCard
              label="Last Detection"
              value={formatDateTime(liveStatusQuery.data?.lastDetectionAt)}
            />
            <StatCard
              label="Pending Commands"
              value={liveStatusQuery.data?.pendingCommands ?? 0}
            />
          </Box>

          {liveStatusQuery.data?.devices.length ? (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {liveStatusQuery.data.devices.map((device) => (
                  <Box
                    key={device.id}
                    sx={{
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      gap: 1,
                      px: 1.25,
                      py: 0.75,
                    }}
                  >
                    <Typography variant="body2">{device.name}</Typography>
                    <IotDeviceStatusChip status={device.status} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          ) : null}

          <Stack alignItems={{ xs: 'stretch', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              onClick={() => setManualOpenOpen(true)}
              startIcon={<MeetingRoom />}
              sx={{ minHeight: 48 }}
              variant="contained"
            >
              Manual Open
            </Button>
            {liveStatusQuery.data ? (
              <StatusChip status={liveStatusQuery.data.isActive ? 'ACTIVE' : 'DISABLED'} />
            ) : null}
          </Stack>

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Typography p={2} variant="subtitle2">
              Latest Detections
            </Typography>
            <AppDataGrid
              columns={detectionColumns}
              emptyState={{
                description: 'Detections from ANPR, RFID, and QR readers appear here.',
                illustration: 'empty',
                title: 'No detections yet',
              }}
              loading={detectionsQuery.isLoading}
              rows={detectionsQuery.data ?? []}
            />
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Typography p={2} variant="subtitle2">
              Latest Access Attempts
            </Typography>
            <AppDataGrid
              columns={attemptColumns}
              emptyState={{
                description: 'Granted and denied gate access attempts appear here.',
                illustration: 'empty',
                title: 'No access attempts yet',
              }}
              loading={attemptsQuery.isLoading}
              rows={attemptsQuery.data ?? []}
            />
          </Paper>
        </>
      ) : null}

      <Dialog fullWidth maxWidth="sm" onClose={() => setManualOpenOpen(false)} open={manualOpenOpen}>
        <Box component="form" onSubmit={handleManualOpenSubmit}>
          <DialogTitle>Manual Gate Open</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="warning">
                This overrides automatic access rules. The action is logged with your user account.
              </Alert>
              <TextField
                autoFocus
                fullWidth
                label="Reason"
                minRows={3}
                multiline
                onChange={(event) => setManualOpenReason(event.target.value)}
                placeholder="e.g. Visitor escort, barrier stuck, emergency vehicle"
                required
                value={manualOpenReason}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setManualOpenOpen(false)}>Cancel</Button>
            <Button
              disabled={manualOpenMutation.isPending}
              startIcon={manualOpenMutation.isPending ? <CircularProgress color="inherit" size={18} /> : undefined}
              type="submit"
              variant="contained"
            >
              Open Gate
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}