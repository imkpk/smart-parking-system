import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle, Login, Logout, Search } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { searchSecurityGate } from '../../api/securityGateApi';
import { checkInParkingEvent, checkOutParkingEvent } from '../../api/parkingEventsApi';
import { AppSnackbar } from '../../components/common/AppSnackbar';
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
        <Stack spacing={0.5}>
          <Typography variant="h6">Match found</Typography>
          <Typography color="text.secondary" variant="body2">
            Review details before continuing.
          </Typography>
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
            { label: 'Customer', value: match.customerName },
            { label: 'Phone', value: match.customerPhone ?? '—' },
            { label: 'Vehicle', value: match.vehicleNumber },
            {
              label: 'Lot / Slot',
              value: `${match.parkingLotName} · ${match.slotNumber}`,
            },
            {
              label: 'Status',
              value: <BookingStatusChip status={match.bookingStatus} />,
            },
            { label: 'Action', value: gateActionLabel(match.gateAction) },
          ]}
        />
        <Button fullWidth onClick={onSelect} size="large" sx={{ minHeight: 52 }} variant="contained">
          Select
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
        <Stack spacing={1}>
          <Typography variant="h6">Multiple matches found</Typography>
          <Typography color="text.secondary" variant="body2">
            Select the booking or vehicle you want to process.
          </Typography>
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

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Booking</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Lot / Slot</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
              <TableCell align="right"> </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matches.map((match) => (
              <TableRow key={`${match.bookingId}-${match.vehicleNumber}`}>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2">{match.bookingNo}</Typography>
                    <Typography color="text.secondary" variant="caption">
                      {match.bookingCode}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{match.customerName}</TableCell>
                <TableCell>{match.customerPhone ?? '—'}</TableCell>
                <TableCell>{match.vehicleNumber}</TableCell>
                <TableCell>
                  {match.parkingLotName} · {match.slotNumber}
                </TableCell>
                <TableCell>
                  <BookingStatusChip status={match.bookingStatus} />
                </TableCell>
                <TableCell>{gateActionLabel(match.gateAction)}</TableCell>
                <TableCell align="right">
                  <Button onClick={() => onSelect(match)} size="small" variant="outlined">
                    Select
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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

    searchMutation.mutate(trimmedQuery);
  };

  const handleReset = () => {
    setStep('search');
    setResult(null);
    setMatches([]);
    setSuccessMessage('');
    setSearchQuery('');
  };

  const handleSelectMatch = (match: SecurityGateMatchItem) => {
    setResult(matchItemToSingleResult(match));
    setStep('result');
  };

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

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
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
          </Stack>
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
            <CheckCircle color="success" sx={{ fontSize: 56 }} />
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