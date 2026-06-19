import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Login, Logout, Search } from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { searchSecurityGate } from '../../api/securityGateApi';
import { checkInParkingEvent, checkOutParkingEvent } from '../../api/parkingEventsApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { Illustration } from '../../components/common/Illustration';
import { BookingStatusChip } from '../../components/common/BookingStatusChip';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { InfoRows } from '../../components/common/InfoRows';
import { PageHeader } from '../../components/common/PageHeader';
import { ParkingEventStatusChip } from '../../components/common/ParkingEventStatusChip';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { getApiErrorMessage } from '../../lib/apiError';
import { buildGateConfirmDescription } from '../../lib/gateConfirmText';
import { formatBookingNo, formatDateTime, formatSessionNo } from '../../lib/formatters';
import { matchItemToSingleResult } from '../../lib/securityGateMatch';
import {
  SecurityGateMatchItem,
  SecurityGateMultipleMatchesResult,
  SecurityGateRecentVisit,
  SecurityGateSingleResult,
} from '../../types/securityGate';

type GateStep = 'search' | 'matches' | 'result' | 'success';

function gateActionLabel(action: SecurityGateSingleResult['action']) {
  if (action === 'CHECK_IN') {
    return 'Check in';
  }

  if (action === 'CHECK_OUT') {
    return 'Check out';
  }

  return 'No action';
}

function gateMatchActionLabel(match: SecurityGateMatchItem) {
  if (match.gateAction === 'CHECK_IN') {
    return 'Check in';
  }

  if (match.gateAction === 'CHECK_OUT') {
    return 'Check out';
  }

  if (match.bookingStatus === 'COMPLETED') {
    return 'Completed';
  }

  if (match.bookingStatus === 'CANCELLED') {
    return 'Cancelled';
  }

  if (match.bookingStatus === 'EXPIRED') {
    return 'Expired';
  }

  return 'No action';
}

function gateMatchSelectLabel(match: SecurityGateMatchItem) {
  if (match.gateAction === 'CHECK_IN') {
    return 'Use this booking';
  }

  if (match.gateAction === 'CHECK_OUT') {
    return 'Use this session';
  }

  if (match.bookingStatus === 'COMPLETED') {
    return 'Completed';
  }

  if (match.bookingStatus === 'CANCELLED') {
    return 'Cancelled';
  }

  if (match.bookingStatus === 'EXPIRED') {
    return 'Expired';
  }

  return 'No action';
}

function filterGateMatches(matches: SecurityGateMatchItem[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return matches;
  }

  return matches.filter((match) => {
    const searchable = [
      match.bookingNo,
      match.bookingCode,
      match.customerName,
      match.customerPhone,
      match.vehicleNumber,
      match.parkingLotName,
      match.slotNumber,
      match.bookingStatus,
      gateMatchActionLabel(match),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalized);
  });
}

function VehicleActivitySummary({
  activity,
}: {
  activity: SecurityGateSingleResult['vehicleActivity'];
}) {
  const lastVisitLabel = activity.lastVisitAt
    ? formatDateTime(activity.lastVisitAt)
    : 'No previous visits';

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'action.hover',
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Stack spacing={0.75}>
        <Typography variant="subtitle2">Vehicle Activity</Typography>
        <Typography color="text.secondary" variant="body2">
          Today: {activity.todayVisits} visits
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Last 7 days: {activity.last7DaysVisits} visits
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Last 30 days: {activity.last30DaysVisits} visits
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Last 1 year: {activity.last365DaysVisits} visits
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Last visit: {lastVisitLabel}
        </Typography>
      </Stack>
    </Paper>
  );
}

function RecentVisitsPanel({ visits }: { visits: SecurityGateRecentVisit[] }) {
  if (visits.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'action.hover',
          borderRadius: 1,
          p: 1.5,
        }}
      >
        <Typography color="text.secondary" variant="body2">
          No previous visits for this vehicle.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'action.hover',
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Recent Visits</Typography>
        {visits.map((visit) => (
          <Box
            key={visit.sessionNo}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: 1.5,
              '&:first-of-type': { borderTop: 0, pt: 0 },
            }}
          >
            <Stack spacing={0.5}>
              <Stack
                alignItems="center"
                direction="row"
                flexWrap="wrap"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography fontWeight={600} variant="body2">
                  {visit.sessionNo}
                </Typography>
                <ParkingEventStatusChip status={visit.status} />
              </Stack>
              <Typography color="text.secondary" variant="body2">
                {visit.parkingLotName} · Slot {visit.slotNumber}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                In: {formatDateTime(visit.checkInTime)}
                {visit.checkOutTime ? ` · Out: ${formatDateTime(visit.checkOutTime)}` : ''}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function GateResultCard({
  result,
  onAction,
  actionPending,
}: {
  result: SecurityGateSingleResult;
  onAction: () => void;
  actionPending: boolean;
}) {
  const actionLabel =
    result.action === 'CHECK_IN'
      ? 'Check in'
      : result.action === 'CHECK_OUT'
        ? 'Check out'
        : null;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Stack spacing={2}>
        <Stack
          alignItems={{ xs: 'stretch', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
        >
          <Box sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
            <Illustration alt="" maxWidth={88} name="booking" />
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="h6">Match found</Typography>
            <Typography color="text.secondary" variant="body2">
              Review details before continuing.
            </Typography>
          </Stack>
        </Stack>

        <InfoRows
          rows={[
            { label: 'Booking No', value: formatBookingNo(result.booking.id) },
            { label: 'Booking Code', value: result.booking.bookingCode },
            { label: 'Customer', value: result.booking.customerName },
            { label: 'Phone', value: result.booking.customerPhone ?? '—' },
            { label: 'Vehicle Number', value: result.booking.vehicleNumber },
            { label: 'Parking Lot', value: result.booking.parkingLotName },
            { label: 'Floor', value: result.booking.floorName },
            { label: 'Slot', value: result.booking.slotNumber },
            {
              label: 'Booking Status',
              value: <BookingStatusChip status={result.booking.status} />,
            },
            {
              label: 'Session Status',
              value: result.parkingEvent ? (
                <ParkingEventStatusChip status={result.parkingEvent.status} />
              ) : (
                '—'
              ),
            },
            ...(result.parkingEvent
              ? [
                  {
                    label: 'Session No',
                    value: formatSessionNo(result.parkingEvent.id),
                  },
                  {
                    label: 'Checked In At',
                    value: formatDateTime(result.parkingEvent.checkInTime),
                  },
                ]
              : []),
            ...(result.lastCheckOutTime
              ? [
                  {
                    label: 'Last Checked Out At',
                    value: formatDateTime(result.lastCheckOutTime),
                  },
                ]
              : []),
          ]}
        />

        <VehicleActivitySummary activity={result.vehicleActivity} />
        <RecentVisitsPanel visits={result.recentVisits} />

        {result.action === 'CHECK_IN' && result.lastCheckOutTime ? (
          <Alert severity="info">
            Slot is available. Customer can check in again for this booking.
          </Alert>
        ) : null}

        {result.actionDisabledReason ? (
          <Alert severity="warning">{result.actionDisabledReason}</Alert>
        ) : null}

        {actionLabel ? (
          <Button
            color={result.action === 'CHECK_OUT' ? 'warning' : 'primary'}
            disabled={actionPending}
            fullWidth
            onClick={onAction}
            size="large"
            startIcon={result.action === 'CHECK_OUT' ? <Logout /> : <Login />}
            sx={{ minHeight: 52 }}
            variant="contained"
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

function MatchCard({
  match,
  onSelect,
}: {
  match: SecurityGateMatchItem;
  onSelect: () => void;
}) {
  const selectLabel = gateMatchSelectLabel(match);
  const canSelect = match.gateAction !== 'NONE';

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
      }}
    >
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography fontWeight={600}>{match.bookingNo}</Typography>
          <Typography color="text.secondary" variant="body2">
            {match.bookingCode}
          </Typography>
        </Stack>
        <InfoRows
          rows={[
            {
              label: 'Customer',
              value: `${match.customerName}${match.customerPhone ? ` · ${match.customerPhone}` : ''}`,
            },
            { label: 'Vehicle', value: match.vehicleNumber },
            {
              label: 'Lot / Slot',
              value: `${match.parkingLotName} · ${match.slotNumber}`,
            },
            {
              label: 'Status',
              value: <BookingStatusChip status={match.bookingStatus} />,
            },
            { label: 'Gate Action', value: gateMatchActionLabel(match) },
          ]}
        />
        <Button
          color={match.gateAction === 'CHECK_OUT' ? 'warning' : 'primary'}
          disabled={!canSelect}
          fullWidth
          onClick={onSelect}
          size="large"
          sx={{ minHeight: 52 }}
          variant="contained"
        >
          {selectLabel}
        </Button>
      </Stack>
    </Paper>
  );
}

function MultipleMatchesPanel({
  matches,
  onSelect,
  onBack,
}: {
  matches: SecurityGateMatchItem[];
  onSelect: (match: SecurityGateMatchItem) => void;
  onBack: () => void;
}) {
  const [gridSearch, setGridSearch] = useState('');
  const filteredMatches = useMemo(
    () => filterGateMatches(matches, gridSearch),
    [gridSearch, matches],
  );

  const columns = useMemo<GridColDef<SecurityGateMatchItem>[]>(
    () => [
      {
        field: 'bookingNo',
        flex: 1,
        headerName: 'Booking',
        minWidth: 150,
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography variant="body2">{row.bookingNo}</Typography>
            <Typography color="text.secondary" variant="caption">
              {row.bookingCode}
            </Typography>
          </Stack>
        ),
        sortable: false,
      },
      {
        field: 'customerName',
        flex: 1.1,
        headerName: 'Customer',
        minWidth: 150,
        sortable: false,
      },
      {
        field: 'customerPhone',
        headerName: 'Phone',
        minWidth: 130,
        sortable: false,
        valueFormatter: (value) => (value ? String(value) : '—'),
      },
      {
        field: 'vehicleNumber',
        headerName: 'Vehicle',
        minWidth: 120,
        sortable: false,
      },
      {
        field: 'lotSlot',
        flex: 1.2,
        headerName: 'Lot / Slot',
        minWidth: 180,
        sortable: false,
        valueGetter: (_value, row) => `${row.parkingLotName} · ${row.slotNumber}`,
      },
      {
        field: 'bookingStatus',
        headerName: 'Status',
        minWidth: 130,
        renderCell: ({ row }) => <BookingStatusChip status={row.bookingStatus} />,
        sortable: false,
      },
      {
        field: 'gateAction',
        headerName: 'Gate Action',
        minWidth: 110,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography color={row.gateAction === 'NONE' ? 'text.secondary' : 'text.primary'} variant="body2">
            {gateMatchActionLabel(row)}
          </Typography>
        ),
      },
      {
        field: 'actions',
        align: 'right',
        filterable: false,
        headerAlign: 'right',
        headerName: 'Action',
        minWidth: 168,
        sortable: false,
        renderCell: ({ row }) => {
          const selectLabel = gateMatchSelectLabel(row);
          const canSelect = row.gateAction !== 'NONE';

          return (
            <Button
              color={row.gateAction === 'CHECK_OUT' ? 'warning' : 'primary'}
              disabled={!canSelect}
              onClick={() => onSelect(row)}
              size="small"
              sx={{ whiteSpace: 'nowrap' }}
              variant={canSelect ? 'contained' : 'outlined'}
            >
              {selectLabel}
            </Button>
          );
        },
      },
    ],
    [onSelect],
  );

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
        <Stack
          alignItems={{ xs: 'stretch', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
        >
          <Box sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
            <Illustration alt="" maxWidth={96} name="cityDriver" />
          </Box>
          <Stack spacing={1}>
            <Typography variant="h6">Multiple matches found</Typography>
            <Typography color="text.secondary" variant="body2">
              Choose the booking or active session you want to process.
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 2 }}>
        {matches.map((match) => (
          <MatchCard
            key={`${match.bookingId}-${match.vehicleNumber}`}
            match={match}
            onSelect={() => onSelect(match)}
          />
        ))}
      </Box>

      <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '100%' }}>
        <AppDataGrid
          checkboxSelection={false}
          columns={columns}
          emptyState={{
            description: 'Try a booking no, customer, phone, vehicle, lot, or slot.',
            illustration: 'empty',
            title: 'No matching rows',
          }}
          getRowId={(row) => `${row.bookingId}-${row.vehicleNumber}`}
          gridSx={{
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'hidden',
            },
          }}
          rows={filteredMatches}
          search={{
            onChange: (event) => setGridSearch(event.target.value),
            onClear: () => setGridSearch(''),
            placeholder:
              'Search by booking no, booking code, customer, phone, vehicle, lot, slot, or gate action',
            value: gridSearch,
          }}
        />
      </Box>

      <Button fullWidth onClick={onBack} size="large" variant="outlined">
        Search again
      </Button>
    </Stack>
  );
}

export function SecurityGatePage() {
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [step, setStep] = useState<GateStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<SecurityGateMultipleMatchesResult['matches']>([]);
  const [result, setResult] = useState<SecurityGateSingleResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const invalidateOperationalQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parking-events'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const searchMutation = useMutation({
    mutationFn: searchSecurityGate,
    onSuccess: (data) => {
      if (data.resultType === 'NOT_FOUND') {
        setNotFoundMessage(data.message);
        setMatches([]);
        setResult(null);
        setStep('search');
        return;
      }

      setNotFoundMessage(null);

      if (data.resultType === 'MULTIPLE_MATCHES') {
        setMatches(data.matches);
        setResult(null);
        setStep('matches');
        return;
      }

      setResult(data);
      setMatches([]);
      setStep('result');
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });

  const checkInMutation = useMutation({
    mutationFn: checkInParkingEvent,
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setConfirmOpen(false);
      setSuccessMessage('Vehicle checked in successfully.');
      setStep('success');
      showSuccess('Checked in.');
    },
    onError: (error) => {
      setConfirmOpen(false);
      showError(getApiErrorMessage(error));
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOutParkingEvent,
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setConfirmOpen(false);
      setResult(null);
      setSuccessMessage('Vehicle checked out successfully.');
      setStep('success');
      showSuccess('Checked out.');
    },
    onError: (error) => {
      setConfirmOpen(false);
      const message = getApiErrorMessage(error);
      showError(message);
      if (message.toLowerCase().includes('already checked out')) {
        setResult(null);
        setStep('search');
      }
    },
  });

  const actionPending = checkInMutation.isPending || checkOutMutation.isPending;

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      showError('Enter a booking code, vehicle number, or phone number.');
      return;
    }

    setNotFoundMessage(null);
    searchMutation.mutate(trimmedQuery);
  };

  const handleReset = () => {
    setStep('search');
    setResult(null);
    setMatches([]);
    setNotFoundMessage(null);
    setSuccessMessage('');
    setSearchQuery('');
  };

  const handleSelectMatch = useCallback((match: SecurityGateMatchItem) => {
    if (match.gateAction === 'NONE') {
      return;
    }

    setResult(matchItemToSingleResult(match));
    setStep('result');
  }, []);

  const handleConfirmAction = () => {
    if (!result) {
      return;
    }

    if (result.action === 'CHECK_IN') {
      checkInMutation.mutate({
        bookingId: result.booking.id,
        bookingCode: result.booking.bookingCode,
      });
      return;
    }

    if (result.action === 'CHECK_OUT' && result.parkingEvent) {
      checkOutMutation.mutate({ parkingEventId: result.parkingEvent.id });
    }
  };

  const confirmTitle =
    result?.action === 'CHECK_OUT' ? 'Confirm check-out' : 'Confirm check-in';
  const confirmDescription = result ? buildGateConfirmDescription(result) : '';

  const useWideLayout = step === 'matches';

  return (
    <Stack
      spacing={3}
      sx={{
        maxWidth: useWideLayout ? 'none' : 720,
        mx: useWideLayout ? 0 : 'auto',
        width: '100%',
      }}
    >
      <PageHeader
        description="Search by booking code, booking no, vehicle number, or phone number."
        title="Security Gate"
      />

      {step === 'search' ? (
        <Paper
          component="form"
          elevation={0}
          onSubmit={handleSearch}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(160px, 220px) 1fr' },
            }}
          >
            <Box sx={{ maxWidth: { xs: 200, sm: 220 }, mx: { xs: 'auto', sm: 0 }, width: '100%' }}>
              <Illustration
                alt="Security guard checking a vehicle at the parking gate"
                maxWidth="100%"
                name="securityGateCheck"
              />
            </Box>
            <Stack spacing={2}>
              <TextField
                autoComplete="off"
                autoFocus
                fullWidth
                label="Search booking code, booking no, vehicle number, or phone number"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search booking code, booking no, vehicle number, or phone number"
                size="medium"
                type="text"
                value={searchQuery}
              />
              <Button
                disabled={searchMutation.isPending}
                fullWidth
                size="large"
                startIcon={
                  searchMutation.isPending ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : (
                    <Search />
                  )
                }
                sx={{ minHeight: 52 }}
                type="submit"
                variant="contained"
              >
                Search
              </Button>
              {notFoundMessage ? <Alert severity="warning">{notFoundMessage}</Alert> : null}
            </Stack>
          </Box>
        </Paper>
      ) : null}

      {step === 'matches' ? (
        <MultipleMatchesPanel
          matches={matches}
          onBack={handleReset}
          onSelect={handleSelectMatch}
        />
      ) : null}

      {step === 'result' && result ? (
        <Stack spacing={2}>
          <GateResultCard
            actionPending={actionPending}
            onAction={() => setConfirmOpen(true)}
            result={result}
          />
          <Button fullWidth onClick={handleReset} size="large" variant="outlined">
            Search again
          </Button>
        </Stack>
      ) : null}

      {step === 'success' ? (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <Illustration alt="" maxWidth={180} name="gateEntrance" />
            <Typography variant="h6">{successMessage}</Typography>
            <Button fullWidth onClick={handleReset} size="large" variant="contained">
              Search again
            </Button>
          </Stack>
        </Paper>
      ) : null}

      <Box sx={{ display: { xs: 'block', md: 'none' }, height: 16 }} />

      <ConfirmDialog
        confirmLabel={result?.action === 'CHECK_OUT' ? 'Check out' : 'Check in'}
        description={confirmDescription}
        isLoading={actionPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        open={confirmOpen}
        title={confirmTitle}
      />

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}