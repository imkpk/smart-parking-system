import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Login, Logout } from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import {
  checkInParkingEvent,
  checkOutParkingEvent,
  getActiveParkingEvents,
  getParkingEventHistory,
  getParkingEvents,
} from '../../api/parkingEventsApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { ParkingEventStatusChip } from '../../components/common/ParkingEventStatusChip';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { useAuth } from '../../providers/AuthProvider';
import { CheckOutResult, ParkingEvent } from '../../types/parkingEvent';

type SnackbarState = { message: string; severity: 'success' | 'error' } | null;
type EventTab = 'active' | 'history';

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatCurrency(value: number | string | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `₹${Number(value).toFixed(2)}`;
}

export function ParkingEventsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSecurity = user?.role === 'SECURITY';
  const isAdmin = user?.role === 'ADMIN';
  const isUser = user?.role === 'USER';
  const canOperateParkingEvents = isAdmin || isSecurity;
  const [activeTab, setActiveTab] = useState<EventTab>(isUser ? 'history' : 'active');
  const [bookingCode, setBookingCode] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState<ParkingEvent | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckOutResult | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const activeEventsQuery = useQuery({
    queryKey: ['parking-events', 'active'],
    queryFn: getActiveParkingEvents,
    enabled: canOperateParkingEvents,
  });
  const historyQuery = useQuery({
    queryKey: ['parking-events', isUser ? 'history' : 'all'],
    queryFn: isUser ? getParkingEventHistory : getParkingEvents,
    enabled: isUser || isAdmin,
  });

  const invalidateParkingEvents = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parking-events'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['parking-lots'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const checkInMutation = useMutation({
    mutationFn: checkInParkingEvent,
    onSuccess: async (parkingEvent) => {
      await invalidateParkingEvents();
      setBookingCode('');
      setBookingId('');
      setSnackbar({
        message: `Checked in booking #${parkingEvent.bookingId}.`,
        severity: 'success',
      });
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });
  const checkOutMutation = useMutation({
    mutationFn: checkOutParkingEvent,
    onSuccess: async (result) => {
      await invalidateParkingEvents();
      setCheckoutTarget(null);
      setCheckoutResult(result);
      setSnackbar({ message: 'Parking event checked out.', severity: 'success' });
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });

  const activeColumns = useMemo<GridColDef<ParkingEvent>[]>(
    () => [
      { field: 'id', headerName: 'Event ID', minWidth: 110 },
      { field: 'bookingId', headerName: 'Booking ID', minWidth: 120 },
      { field: 'vehicleId', headerName: 'Vehicle ID', minWidth: 120 },
      { field: 'slotId', headerName: 'Slot ID', minWidth: 110 },
      { field: 'parkingLotId', headerName: 'Lot ID', minWidth: 100 },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 130,
        renderCell: ({ row }) => <ParkingEventStatusChip status={row.status} />,
      },
      {
        field: 'checkInTime',
        flex: 1,
        headerName: 'Check-in Time',
        minWidth: 190,
        valueGetter: (_value, row) => formatDateTime(row.checkInTime),
      },
      ...(canOperateParkingEvents
        ? [
            {
              field: 'actions',
              align: 'right',
              filterable: false,
              headerAlign: 'right',
              headerName: 'Actions',
              minWidth: 150,
              sortable: false,
              renderCell: ({ row }) => (
                <Stack direction="row" justifyContent="flex-end" width="100%">
                  <Button
                    color="warning"
                    onClick={() => setCheckoutTarget(row)}
                    size="small"
                    startIcon={<Logout />}
                    variant="outlined"
                  >
                    Check out
                  </Button>
                </Stack>
              ),
            } satisfies GridColDef<ParkingEvent>,
          ]
        : []),
    ],
    [canOperateParkingEvents],
  );

  const historyColumns = useMemo<GridColDef<ParkingEvent>[]>(
    () => [
      { field: 'id', headerName: 'Event ID', minWidth: 110 },
      { field: 'bookingId', headerName: 'Booking ID', minWidth: 120 },
      { field: 'vehicleId', headerName: 'Vehicle ID', minWidth: 120 },
      { field: 'slotId', headerName: 'Slot ID', minWidth: 110 },
      { field: 'parkingLotId', headerName: 'Lot ID', minWidth: 100 },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 130,
        renderCell: ({ row }) => <ParkingEventStatusChip status={row.status} />,
      },
      {
        field: 'checkInTime',
        headerName: 'Check-in Time',
        minWidth: 190,
        valueGetter: (_value, row) => formatDateTime(row.checkInTime),
      },
      {
        field: 'checkOutTime',
        headerName: 'Check-out Time',
        minWidth: 190,
        valueGetter: (_value, row) => formatDateTime(row.checkOutTime),
      },
      {
        field: 'durationMinutes',
        headerName: 'Duration',
        minWidth: 130,
        valueGetter: (_value, row) =>
          row.durationMinutes === null ? '-' : `${row.durationMinutes} min`,
      },
      {
        field: 'feeAmount',
        headerName: 'Fee',
        minWidth: 120,
        valueGetter: (_value, row) => formatCurrency(row.feeAmount),
      },
    ],
    [],
  );

  const handleCheckIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedBookingCode = bookingCode.trim();
    const trimmedBookingId = bookingId.trim();

    if (!trimmedBookingCode && !trimmedBookingId) {
      setSnackbar({
        message: 'Enter booking code or booking ID.',
        severity: 'error',
      });
      return;
    }

    if (trimmedBookingCode) {
      checkInMutation.mutate({ bookingCode: trimmedBookingCode });
      return;
    }

    const parsedBookingId = Number(trimmedBookingId);

    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0) {
      setSnackbar({
        message: 'Enter a valid booking ID.',
        severity: 'error',
      });
      return;
    }

    checkInMutation.mutate({ bookingId: parsedBookingId });
  };

  const activeRows = activeEventsQuery.data ?? [];
  const historyRows = historyQuery.data ?? [];
  const activeError = activeEventsQuery.error;
  const historyError = historyQuery.error;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Parking Events"
        description={
          isSecurity
            ? 'Check in vehicles, monitor active events, and complete check-outs.'
            : isAdmin
              ? 'Check in vehicles, monitor active events, complete check-outs, and review history.'
            : 'Review parking event activity and history.'
        }
      />

      {canOperateParkingEvents ? (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Box component="form" onSubmit={handleCheckIn}>
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography fontWeight={700}>Vehicle Check-in</Typography>
                <Typography color="text.secondary" variant="body2">
                  Search with either booking code or booking ID.
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: '5fr 3fr 4fr' },
                }}
              >
                <TextField
                  fullWidth
                  label="Booking Code"
                  onChange={(event) => setBookingCode(event.target.value)}
                  placeholder="BK-..."
                  value={bookingCode}
                />
                <TextField
                  fullWidth
                  label="Booking ID"
                  onChange={(event) => setBookingId(event.target.value)}
                  type="number"
                  value={bookingId}
                />
                <Box>
                  <Button
                    disabled={checkInMutation.isPending}
                    fullWidth
                    size="large"
                    startIcon={<Login />}
                    sx={{ height: '100%' }}
                    type="submit"
                    variant="contained"
                  >
                    Check In
                  </Button>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Paper>
      ) : null}

      {isUser ? null : (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Tabs
            onChange={(_event, nextTab: EventTab) => setActiveTab(nextTab)}
            value={activeTab}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Active Events" value="active" />
            {isAdmin ? <Tab label="Event History" value="history" /> : null}
          </Tabs>
        </Paper>
      )}

      {canOperateParkingEvents && activeTab === 'active' ? (
        <Stack spacing={2}>
          {activeError ? (
            <Alert severity={isForbiddenError(activeError) ? 'warning' : 'error'}>
              {isForbiddenError(activeError)
                ? 'Access denied.'
                : getApiErrorMessage(activeError, 'Could not load active parking events.')}
            </Alert>
          ) : null}
          <AppDataGrid
            columns={activeColumns}
            height="calc(100vh - 360px)"
            loading={activeEventsQuery.isLoading || activeEventsQuery.isFetching}
            rows={activeRows}
          />
        </Stack>
      ) : null}

      {(isUser || (isAdmin && activeTab === 'history')) ? (
        <Stack spacing={2}>
          {isUser ? (
            <>
              <Typography fontWeight={700}>My Parking History</Typography>
              <Divider />
            </>
          ) : null}
          {historyError ? (
            <Alert severity={isForbiddenError(historyError) ? 'warning' : 'error'}>
              {isForbiddenError(historyError)
                ? 'Access denied.'
                : getApiErrorMessage(historyError, 'Could not load parking event history.')}
            </Alert>
          ) : null}
          <AppDataGrid
            columns={historyColumns}
            height="calc(100vh - 300px)"
            loading={historyQuery.isLoading || historyQuery.isFetching}
            rows={historyRows}
          />
        </Stack>
      ) : null}

      <ConfirmDialog
        confirmLabel="Check Out"
        description={
          checkoutTarget
            ? `Check out active parking event #${checkoutTarget.id}? This will calculate the fee and release the slot.`
            : ''
        }
        isLoading={checkOutMutation.isPending}
        onClose={() => setCheckoutTarget(null)}
        onConfirm={() => {
          if (checkoutTarget) {
            checkOutMutation.mutate({ parkingEventId: checkoutTarget.id });
          }
        }}
        open={Boolean(checkoutTarget)}
        title="Confirm Check-out"
      />

      <Dialog fullWidth maxWidth="sm" onClose={() => setCheckoutResult(null)} open={Boolean(checkoutResult)}>
        <DialogTitle>Check-out Result</DialogTitle>
        <DialogContent>
          {checkoutResult ? (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Event</Typography>
                <Typography fontWeight={700}>#{checkoutResult.parkingEvent.id}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Duration</Typography>
                <Typography fontWeight={700}>
                  {checkoutResult.parkingEvent.durationMinutes ?? 0} min
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Fee</Typography>
                <Typography fontWeight={700}>
                  {formatCurrency(checkoutResult.parkingEvent.feeAmount)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Payment Initiated</Typography>
                <Typography fontWeight={700}>
                  {checkoutResult.paymentInitiated ? 'Yes' : 'No'}
                </Typography>
              </Stack>
              {checkoutResult.payment?.status ? (
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Payment Status</Typography>
                  <Typography fontWeight={700}>{checkoutResult.payment.status}</Typography>
                </Stack>
              ) : null}
              {checkoutResult.paymentError ? (
                <Alert severity="warning">{checkoutResult.paymentError}</Alert>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutResult(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar autoHideDuration={3500} onClose={() => setSnackbar(null)} open={Boolean(snackbar)}>
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity ?? 'success'} variant="filled">
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
