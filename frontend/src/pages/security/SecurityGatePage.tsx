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
import { SecurityGateSearchResult } from '../../types/securityGate';

type GateStep = 'search' | 'result' | 'success';

function GateResultCard({
  result,
  onAction,
  actionPending,
}: {
  result: SecurityGateSearchResult;
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
            { label: 'Vehicle Number', value: result.booking.vehicleNumber },
            { label: 'Parking Lot', value: result.booking.parkingLotName },
            { label: 'Floor', value: result.booking.floorName },
            { label: 'Slot', value: result.booking.slotNumber },
            {
              label: 'Booking Status',
              value: <BookingStatusChip status={result.booking.status} />,
            },
            ...(result.parkingEvent
              ? [
                  {
                    label: 'Session No',
                    value: formatSessionNo(result.parkingEvent.id),
                  },
                  {
                    label: 'Session Status',
                    value: <ParkingEventStatusChip status={result.parkingEvent.status} />,
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

export function SecurityGatePage() {
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [step, setStep] = useState<GateStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<SecurityGateSearchResult | null>(null);
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
      setResult(data);
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
      showError('Enter a booking code or vehicle number.');
      return;
    }

    searchMutation.mutate(trimmedQuery);
  };

  const handleReset = () => {
    setStep('search');
    setResult(null);
    setSuccessMessage('');
    setSearchQuery('');
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
        description="Search by booking code or vehicle number, then check vehicles in or out."
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
              label="Booking code or vehicle number"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="e.g. BK-ORG1 or TS09EA1234"
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