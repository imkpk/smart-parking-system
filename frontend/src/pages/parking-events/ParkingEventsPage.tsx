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
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
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
  getParkingEvents
} from '../../api/parkingEventsApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  DetailsDialog,
  DetailsRow
} from '../../components/common/DetailsDialog';
import { InfoRows } from '../../components/common/InfoRows';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchField } from '../../components/common/SearchField';
import { ParkingEventStatusChip } from '../../components/common/ParkingEventStatusChip';
import { QueryErrorAlert } from '../../components/common/QueryErrorAlert';
import {
  createBookingColumn,
  createDateTimeColumn,
  createDetailsColumn,
  createSessionColumn,
  createStatusColumn,
  createVehicleColumn
} from '../../components/common/gridColumns';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { useReferenceLabels } from '../../hooks/useReferenceLabels';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage } from '../../lib/apiError';
import { filterParkingEvents } from '../../lib/searchFilters';
import {
  formatBookingNo,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatRupees,
  formatSessionNo,
} from '../../lib/formatters';
import { CheckOutResult, ParkingEvent } from '../../types/parkingEvent';

type EventTab = 'active' | 'history';

function buildParkingEventSummaryRows(
  event: ParkingEvent,
  labels: ReturnType<typeof useReferenceLabels>,
  showCustomer: boolean,
): DetailsRow[] {
  const rows: DetailsRow[] = [
    { label: 'Session No', value: formatSessionNo(event.id) },
    { label: 'Booking No', value: formatBookingNo(event.bookingId) },
  ];

  if (showCustomer) {
    rows.push({ label: 'Customer', value: labels.getCustomerLabel(event.userId) });
  }

  rows.push(
    { label: 'Vehicle Number', value: labels.getVehicleLabel(event.vehicleId) },
    { label: 'Parking Lot', value: labels.getParkingLotLabel(event.parkingLotId) },
    { label: 'Slot', value: labels.getSlotLabel(event.slotId) },
    { label: 'Status', value: <ParkingEventStatusChip status={event.status} /> },
    { label: 'Checked In At', value: formatDateTime(event.checkInTime) },
    { label: 'Checked Out At', value: formatDateTime(event.checkOutTime) },
    { label: 'Duration', value: formatDuration(event.durationMinutes) },
    { label: 'Fee', value: formatCurrency(event.feeAmount) },
  );

  return rows;
}

function buildParkingEventTechnicalRows(event: ParkingEvent): DetailsRow[] {
  return [
    { label: 'parkingEventId', value: event.id },
    { label: 'bookingId', value: event.bookingId },
    { label: 'userId', value: event.userId },
    { label: 'vehicleId', value: event.vehicleId },
    { label: 'slotId', value: event.slotId },
    { label: 'parkingLotId', value: event.parkingLotId },
    { label: 'status', value: event.status },
  ];
}

function buildParkingEventHistoryColumns({
  canViewCustomer,
  isUser,
  labels,
  onViewDetails
}: {
  canViewCustomer: boolean;
  isUser: boolean;
  labels: ReturnType<typeof useReferenceLabels>;
  onViewDetails: (event: ParkingEvent) => void;
}): GridColDef<ParkingEvent>[] {
  const adminOnlyColumns: GridColDef<ParkingEvent>[] = isUser
    ? []
    : [createSessionColumn<ParkingEvent>()];

  return [
    ...adminOnlyColumns,
    createBookingColumn<ParkingEvent>(),
    ...(canViewCustomer
      ? [
          {
            field: 'userId',
            flex: 1,
            headerName: 'Customer',
            minWidth: 220,
            valueGetter: (_value, row) => labels.getCustomerLabel(row.userId)
          } satisfies GridColDef<ParkingEvent>
        ]
      : []),
    createVehicleColumn<ParkingEvent>((vehicleId) => labels.getVehicleLabel(vehicleId)),
    {
      field: 'parkingLotId',
      flex: 1,
      headerName: 'Parking Lot',
      minWidth: 180,
      valueGetter: (_value, row) => labels.getParkingLotLabel(row.parkingLotId)
    },
    {
      field: 'slotId',
      headerName: 'Slot',
      minWidth: 130,
      valueGetter: (_value, row) => labels.getSlotLabel(row.slotId)
    },
    createStatusColumn<ParkingEvent>((row) => (
      <ParkingEventStatusChip status={row.status} />
    )),
    createDateTimeColumn<ParkingEvent>(
      'checkInTime',
      'Checked In At',
      (row) => row.checkInTime
    ),
    createDateTimeColumn<ParkingEvent>(
      'checkOutTime',
      'Checked Out At',
      (row) => row.checkOutTime
    ),
    {
      field: 'durationMinutes',
      headerName: 'Duration',
      minWidth: 130,
      valueGetter: (_value, row) => formatDuration(row.durationMinutes)
    },
    {
      field: 'feeAmount',
      headerName: 'Fee',
      minWidth: 120,
      valueGetter: (_value, row) => formatCurrency(row.feeAmount)
    },
    createDetailsColumn<ParkingEvent>(onViewDetails)
  ];
}

function buildCheckoutResultRows(checkoutResult: CheckOutResult): DetailsRow[] {
  return [
    { label: 'Event', value: `#${checkoutResult.parkingEvent.id}` },
    {
      label: 'Duration',
      value: `${checkoutResult.parkingEvent.durationMinutes ?? 0} min`
    },
    {
      label: 'Fee',
      value: formatRupees(checkoutResult.parkingEvent.feeAmount)
    },
    {
      label: 'Payment Initiated',
      value: checkoutResult.paymentInitiated ? 'Yes' : 'No'
    },
    ...(checkoutResult.payment?.status
      ? [{ label: 'Payment Status', value: checkoutResult.payment.status }]
      : [])
  ];
}

function CheckoutResultDialog({
  checkoutResult,
  onClose
}: {
  checkoutResult: CheckOutResult | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      fullWidth
      maxWidth='sm'
      onClose={onClose}
      open={Boolean(checkoutResult)}>
      <DialogTitle>Check-out Result</DialogTitle>
      <DialogContent>
        {checkoutResult ? (
          <Stack spacing={2}>
            <InfoRows rows={buildCheckoutResultRows(checkoutResult)} />
            {checkoutResult.paymentError ? (
              <Alert severity='warning'>{checkoutResult.paymentError}</Alert>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant='contained'>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ParkingEventsPage() {
  const { user, isSecurity, isAdmin, isUser, canOperateParkingEvents } =
    useUserRole();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [activeTab, setActiveTab] = useState<EventTab>(
    isUser ? 'history' : 'active'
  );
  const [bookingCode, setBookingCode] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState<ParkingEvent | null>(
    null
  );
  const [checkoutResult, setCheckoutResult] = useState<CheckOutResult | null>(
    null
  );
  const [detailsEvent, setDetailsEvent] = useState<ParkingEvent | null>(null);
  const [search, setSearch] = useState('');

  const activeEventsQuery = useQuery({
    queryKey: ['parking-events', 'active'],
    queryFn: getActiveParkingEvents,
    enabled: canOperateParkingEvents
  });
  const historyQuery = useQuery({
    queryKey: ['parking-events', isUser ? 'history' : 'all'],
    queryFn: isUser ? getParkingEventHistory : getParkingEvents,
    enabled: isUser || isAdmin
  });
  const labels = useReferenceLabels({
    context: 'event-enrichment',
    includeParkingStructure: canOperateParkingEvents || isUser,
    includeUsers: isAdmin,
    role: user?.role
  });

  const invalidateParkingEvents = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parking-events'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['parking-lots'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    ]);
  };

  const checkInMutation = useMutation({
    mutationFn: checkInParkingEvent,
    onSuccess: async (parkingEvent) => {
      await invalidateParkingEvents();
      setBookingCode('');
      setBookingId('');
      showSuccess(`Checked in booking #${parkingEvent.bookingId}.`);
    },
    onError: (error) => showError(getApiErrorMessage(error))
  });
  const checkOutMutation = useMutation({
    mutationFn: checkOutParkingEvent,
    onSuccess: async (result) => {
      await invalidateParkingEvents();
      setCheckoutTarget(null);
      setCheckoutResult(result);
      showSuccess('Parking event checked out.');
    },
    onError: (error) => showError(getApiErrorMessage(error))
  });

  const activeColumns = useMemo<GridColDef<ParkingEvent>[]>(
    () => [
      createSessionColumn<ParkingEvent>(),
      createBookingColumn<ParkingEvent>(),
      ...(canOperateParkingEvents
        ? [
            {
              field: 'userId',
              flex: 1,
              headerName: 'Customer',
              minWidth: 220,
              valueGetter: (_value, row) => labels.getCustomerLabel(row.userId)
            } satisfies GridColDef<ParkingEvent>
          ]
        : []),
      createVehicleColumn<ParkingEvent>((vehicleId) => labels.getVehicleLabel(vehicleId)),
      {
        field: 'slotId',
        headerName: 'Slot',
        minWidth: 130,
        valueGetter: (_value, row) => labels.getSlotLabel(row.slotId)
      },
      {
        field: 'parkingLotId',
        flex: 1,
        headerName: 'Parking Lot',
        minWidth: 180,
        valueGetter: (_value, row) =>
          labels.getParkingLotLabel(row.parkingLotId)
      },
      createStatusColumn<ParkingEvent>((row) => (
        <ParkingEventStatusChip status={row.status} />
      )),
      createDateTimeColumn<ParkingEvent>(
        'checkInTime',
        'Checked In At',
        (row) => row.checkInTime,
        { flex: 1 }
      ),
      createDetailsColumn<ParkingEvent>(setDetailsEvent),
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
                <Stack direction='row' justifyContent='flex-end' width='100%'>
                  <Button
                    color='warning'
                    onClick={() => setCheckoutTarget(row)}
                    size='small'
                    startIcon={<Logout />}
                    variant='outlined'>
                    Check out
                  </Button>
                </Stack>
              )
            } satisfies GridColDef<ParkingEvent>
          ]
        : [])
    ],
    [canOperateParkingEvents, labels]
  );

  const historyColumns = useMemo<GridColDef<ParkingEvent>[]>(
    () =>
      buildParkingEventHistoryColumns({
        canViewCustomer: canOperateParkingEvents,
        isUser,
        labels,
        onViewDetails: setDetailsEvent
      }),
    [canOperateParkingEvents, isUser, labels]
  );

  const handleCheckIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedBookingCode = bookingCode.trim();
    const trimmedBookingId = bookingId.trim();

    if (!trimmedBookingCode && !trimmedBookingId) {
      showError('Enter booking code or booking ID.');
      return;
    }

    if (trimmedBookingCode) {
      checkInMutation.mutate({ bookingCode: trimmedBookingCode });
      return;
    }

    const parsedBookingId = Number(trimmedBookingId);

    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0) {
      showError('Enter a valid booking ID.');
      return;
    }

    checkInMutation.mutate({ bookingId: parsedBookingId });
  };

  const activeRows = useMemo(
    () => filterParkingEvents(activeEventsQuery.data ?? [], search, labels),
    [activeEventsQuery.data, labels, search],
  );
  const historyRows = useMemo(
    () => filterParkingEvents(historyQuery.data ?? [], search, labels),
    [historyQuery.data, labels, search],
  );
  const activeError = activeEventsQuery.error;
  const historyError = historyQuery.error;

  return (
    <Stack spacing={1}>
      <PageHeader
        title='Parking Events'
        description={
          isSecurity
            ? 'Check in vehicles, monitor active events, and complete check-outs.'
            : isAdmin
              ? 'Check in vehicles, monitor active events, complete check-outs, and review history.'
              : 'Review parking event activity and history.'
        }
      />

      {canOperateParkingEvents ? (
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
          <Box component='form' onSubmit={handleCheckIn}>
            <Stack spacing={1}>
              <Stack spacing={0.5}>
                <Typography fontWeight={700}>Vehicle Check-in</Typography>
                <Typography color='text.secondary' variant='body2'>
                  Search with either booking code or booking ID.
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: '4fr 2fr 2fr' }
                }}>
                <TextField
                  fullWidth
                  size='small'
                  label='Booking Code'
                  onChange={(event) => setBookingCode(event.target.value)}
                  placeholder='BK-...'
                  value={bookingCode}
                />
                <TextField
                  fullWidth
                  size='small'
                  label='Booking ID'
                  onChange={(event) => setBookingId(event.target.value)}
                  type='text'
                  value={bookingId}
                />
                <Box>
                  <Button
                    disabled={checkInMutation.isPending}
                    fullWidth
                    size='small'
                    startIcon={<Login />}
                    sx={{ height: '100%' }}
                    type='submit'
                    variant='contained'>
                    Check In
                  </Button>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Paper>
      ) : null}

      {isUser ? null : (
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Tabs
            onChange={(_event, nextTab: EventTab) => setActiveTab(nextTab)}
            value={activeTab}
            variant='scrollable'
            scrollButtons='auto'>
            <Tab label='Active Events' value='active' />
            {isAdmin ? <Tab label='Event History' value='history' /> : null}
          </Tabs>
        </Paper>
      )}

      <Box sx={{ mt: 2 }}>
        <SearchField
          // label='Search parking events'
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          placeholder='Search by session no, booking no, vehicle number, customer, parking lot, slot, or status'
          value={search}
        />
      </Box>

      {canOperateParkingEvents && activeTab === 'active' ? (
        <Stack spacing={2}>
          {activeError ? (
            <QueryErrorAlert
              error={activeError}
              fallbackMessage='Could not load active parking events.'
            />
          ) : null}
          <AppDataGrid
            columns={activeColumns}
            emptyState={{
              description: search
                ? 'Try a session no, booking no, vehicle number, or status.'
                : 'Active parking sessions will appear here after check-in.',
              title: search ? 'No matching active events' : 'No active parking events',
            }}
            height='calc(100vh - 360px)'
            loading={
              activeEventsQuery.isLoading || activeEventsQuery.isFetching
            }
            rows={activeRows}
          />
        </Stack>
      ) : null}

      {isUser || (isAdmin && activeTab === 'history') ? (
        <Stack spacing={2}>
          {isUser ? (
            <>
              <Typography fontWeight={700}>My Parking History</Typography>
              <Divider />
            </>
          ) : null}
          {historyError ? (
            <QueryErrorAlert
              error={historyError}
              fallbackMessage='Could not load parking event history.'
            />
          ) : null}
          <AppDataGrid
            columns={historyColumns}
            emptyState={{
              description: search
                ? 'Try a session no, booking no, vehicle number, or status.'
                : isUser
                  ? 'Your completed parking sessions will appear here.'
                  : 'Completed parking sessions will appear here.',
              title: search ? 'No matching parking events' : 'No parking event history',
            }}
            height='calc(100vh - 300px)'
            loading={historyQuery.isLoading || historyQuery.isFetching}
            rows={historyRows}
          />
        </Stack>
      ) : null}

      <ConfirmDialog
        confirmLabel='Check Out'
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
        title='Confirm Check-out'
      />

      <DetailsDialog
        onClose={() => setDetailsEvent(null)}
        open={Boolean(detailsEvent)}
        title='Parking Session Details'
        summaryRows={
          detailsEvent
            ? buildParkingEventSummaryRows(detailsEvent, labels, canOperateParkingEvents)
            : []
        }
        technicalRows={
          detailsEvent ? buildParkingEventTechnicalRows(detailsEvent) : []
        }
      />

      <CheckoutResultDialog
        checkoutResult={checkoutResult}
        onClose={() => setCheckoutResult(null)}
      />

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}
