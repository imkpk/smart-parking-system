import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  ErrorOutline,
  Payments,
  ReceiptLong,
  Search,
} from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import {
  getPayment,
  getPayments,
  getPaymentSummary,
  getUserPayments,
  mockPaymentFailure,
  mockPaymentSuccess,
} from '../../api/paymentsApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailsDialog, DetailsRow } from '../../components/common/DetailsDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { PaymentStatusChip } from '../../components/common/PaymentStatusChip';
import { QueryErrorAlert } from '../../components/common/QueryErrorAlert';
import { StatCard } from '../../components/common/StatCard';
import {
  createBookingColumn,
  createDateTimeColumn,
  createDetailsColumn,
} from '../../components/common/gridColumns';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { useReferenceLabels } from '../../hooks/useReferenceLabels';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatCurrency, formatDateTime, formatStatusLabel } from '../../lib/formatters';
import { Payment } from '../../types/payment';

type PaymentAction = { type: 'success' | 'failure'; payment: Payment } | null;

function buildPaymentSummaryRows(payment: Payment, labels: ReturnType<typeof useReferenceLabels>): DetailsRow[] {
  return [
    { label: 'Receipt No', value: `Receipt #${payment.id}` },
    { label: 'Booking No', value: labels.getBookingLabel(payment.bookingId) },
    { label: 'Vehicle', value: labels.getVehicleLabelForBooking(payment.bookingId) },
    { label: 'Amount', value: formatCurrency(payment.amount, payment.currency) },
    { label: 'Status', value: <PaymentStatusChip status={payment.status} /> },
    { label: 'Payment Reference', value: payment.providerReference ?? '-' },
  ];
}

function buildPaymentTechnicalRows(payment: Payment): DetailsRow[] {
  return [
    { label: 'Payment ID', value: payment.id },
    { label: 'Event ID', value: payment.parkingEventId },
    { label: 'Booking ID', value: payment.bookingId },
    { label: 'User ID', value: payment.userId },
  ];
}

export function PaymentsPage() {
  const { user, isAdmin, isSecurity, isUser, canViewOperationalPayments } = useUserRole();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [lookupPaymentId, setLookupPaymentId] = useState<number | null>(null);
  const [actionTarget, setActionTarget] = useState<PaymentAction>(null);
  const [detailsPayment, setDetailsPayment] = useState<Payment | null>(null);
  const [failureReason, setFailureReason] = useState('Mock provider declined payment');

  const summaryQuery = useQuery({
    queryKey: ['payments', 'summary'],
    queryFn: getPaymentSummary,
    enabled: isAdmin,
  });
  const paymentsQuery = useQuery({
    queryKey: ['payments', 'all'],
    queryFn: getPayments,
    enabled: canViewOperationalPayments,
  });
  const userPaymentsQuery = useQuery({
    queryKey: ['payments', 'user', user?.id],
    queryFn: () => getUserPayments(user!.id),
    enabled: isUser && Boolean(user?.id),
  });
  const lookupPaymentQuery = useQuery({
    queryKey: ['payments', 'lookup', lookupPaymentId],
    queryFn: () => getPayment(lookupPaymentId!),
    enabled: canViewOperationalPayments && Boolean(lookupPaymentId),
  });
  const labels = useReferenceLabels({
    context: 'payment-enrichment',
    includeUsers: isAdmin,
    role: user?.role,
  });

  const invalidatePayments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['parking-events'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    ]);
  };

  const mockSuccessMutation = useMutation({
    mutationFn: mockPaymentSuccess,
    onSuccess: async () => {
      await invalidatePayments();
      showSuccess('Payment marked SUCCESS.');
      setActionTarget(null);
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });
  const mockFailureMutation = useMutation({
    mutationFn: mockPaymentFailure,
    onSuccess: async () => {
      await invalidatePayments();
      showSuccess('Payment marked FAILED.');
      setActionTarget(null);
      setFailureReason('Mock provider declined payment');
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });

  const baseRows = useMemo(() => {
    if (isUser) {
      return userPaymentsQuery.data ?? [];
    }

    return paymentsQuery.data ?? [];
  }, [isUser, paymentsQuery.data, userPaymentsQuery.data]);

  const rows = useMemo(() => {
    if (lookupPaymentQuery.data) {
      return [lookupPaymentQuery.data];
    }

    const trimmedSearch = appliedSearch.trim().toLowerCase();

    if (!trimmedSearch) {
      return baseRows;
    }

    return baseRows.filter((payment) => {
      const searchableValues = [
        payment.id,
        payment.parkingEventId,
        payment.bookingId,
        labels.getBookingCode(payment.bookingId),
        labels.getVehicleLabelForBooking(payment.bookingId),
        payment.userId,
        payment.status,
        payment.paymentMethod,
        payment.providerReference,
        payment.failureReason,
        payment.currency,
      ];

      return searchableValues.some((value) =>
        String(value ?? '').toLowerCase().includes(trimmedSearch),
      );
    });
  }, [appliedSearch, baseRows, labels, lookupPaymentQuery.data]);

  const columns = useMemo<GridColDef<Payment>[]>(
    () => [
      {
        field: 'id',
        headerName: 'Receipt No',
        minWidth: 130,
        valueGetter: (_value, row) => `Receipt #${row.id}`,
      },
      {
        field: 'parkingEventId',
        headerName: 'Parking Session',
        minWidth: 150,
        valueGetter: (_value, row) => labels.getSessionLabel(row.parkingEventId),
      },
      createBookingColumn<Payment>((row) => labels.getBookingLabel(row.bookingId)),
      ...(isAdmin || isSecurity
        ? [
            {
              field: 'userId',
              flex: 1,
              headerName: 'Customer',
              minWidth: 220,
              valueGetter: (_value, row) => labels.getCustomerLabel(row.userId),
            } satisfies GridColDef<Payment>,
          ]
        : []),
      {
        field: 'vehicle',
        headerName: 'Vehicle',
        minWidth: 160,
        valueGetter: (_value, row) => labels.getVehicleLabelForBooking(row.bookingId),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 140,
        valueGetter: (_value, row) => formatCurrency(row.amount, row.currency),
      },
      { field: 'currency', headerName: 'Currency', minWidth: 110 },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        renderCell: ({ row }) => <PaymentStatusChip status={row.status} />,
      },
      { field: 'paymentMethod', headerName: 'Method', minWidth: 130 },
      {
        field: 'providerReference',
        flex: 1,
        headerName: 'Payment Reference',
        minWidth: 220,
        valueGetter: (_value, row) => row.providerReference ?? '-',
      },
      {
        field: 'failureReason',
        flex: 1,
        headerName: 'Failure Reason',
        minWidth: 220,
        valueGetter: (_value, row) => row.failureReason ?? '-',
      },
      createDateTimeColumn<Payment>('createdAt', 'Paid/Created On', (row) => row.createdAt),
      createDetailsColumn<Payment>(setDetailsPayment),
      ...(isAdmin
        ? [
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
                  <Tooltip title="Mock Success">
                    <span>
                      <IconButton
                        color="success"
                        disabled={row.status !== 'INITIATED'}
                        onClick={() => setActionTarget({ type: 'success', payment: row })}
                      >
                        <CheckCircle />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Mock Failure">
                    <span>
                      <IconButton
                        color="error"
                        disabled={row.status !== 'INITIATED'}
                        onClick={() => setActionTarget({ type: 'failure', payment: row })}
                      >
                        <ErrorOutline />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ),
            } satisfies GridColDef<Payment>,
          ]
        : []),
    ],
    [isAdmin, isSecurity, labels],
  );

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedValue = searchInput.trim();

    if (!trimmedValue) {
      showError('Enter a value to search');
      return;
    }

    setAppliedSearch(trimmedValue);

    if (/^\d+$/.test(trimmedValue)) {
      setLookupPaymentId(Number(trimmedValue));
      return;
    }

    setLookupPaymentId(null);
  };

  const clearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setLookupPaymentId(null);
  };

  const paymentError = isUser
    ? userPaymentsQuery.error
    : lookupPaymentQuery.error ?? paymentsQuery.error;
  const isPaymentLoading =
    paymentsQuery.isLoading ||
    paymentsQuery.isFetching ||
    userPaymentsQuery.isLoading ||
    userPaymentsQuery.isFetching ||
    lookupPaymentQuery.isLoading ||
    lookupPaymentQuery.isFetching;
  const summary = summaryQuery.data;
  const summaryStatuses = summary?.paymentsByStatus ?? {};

  return (
    <Stack spacing={1}>
      <PageHeader
        title="Payments"
        description={
          isAdmin
            ? 'Review payment totals and update mock payment outcomes.'
            : isSecurity
              ? 'Review operational payment status and details.'
              : 'Review your parking payment history.'
        }
      />

      <QueryErrorAlert
        error={summaryQuery.error}
        fallbackMessage="Could not load payment summary."
      />

      {isAdmin ? (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(6, minmax(0, 1fr))',
            },
          }}
        >
          <Box>
            <StatCard
              compact
              icon={<ReceiptLong />}
              label="Total Payments"
              value={summary?.totalPayments ?? 0}
            />
          </Box>
          <Box>
            <StatCard
              accentColor="success.main"
              compact
              icon={<Payments />}
              iconBgcolor="rgba(46, 125, 50, 0.1)"
              label="Successful Amount"
              value={formatCurrency(summary?.successfulAmount ?? 0)}
            />
          </Box>
          {(['INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'] as const).map((status) => (
            <Box key={status}>
              <StatCard
                compact
                label={formatStatusLabel(status)}
                value={summaryStatuses[status] ?? 0}
              />
            </Box>
          ))}
        </Box>
      ) : null}

      <Box component="form" onSubmit={handleSearch}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Search payments"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by payment id, booking id, booking code, event id, or provider ref"
            size="small"
            value={searchInput}
          />
          <Button
            disabled={lookupPaymentQuery.isFetching}
            size="medium"
            startIcon={<Search />}
            type="submit"
            variant="contained"
            sx={{ minWidth: 120 }}
          >
            Search
          </Button>
          <Button onClick={clearSearch} size="medium" variant="outlined" sx={{ minWidth: 96 }}>
            Clear
          </Button>
        </Stack>
      </Box>

      <QueryErrorAlert error={paymentError} fallbackMessage="Could not load payments." />

      <AppDataGrid
        columns={columns}
        height={{ xs: 520, md: 'calc(100vh - 430px)', xl: 'calc(100vh - 360px)' }}
        loading={isPaymentLoading}
        noRowsLabel={
          isAdmin
            ? 'No payments found'
            : isSecurity
              ? 'No operational payments found'
              : 'You have no payment history yet'
        }
        rows={rows}
      />

      <DetailsDialog
        onClose={() => setDetailsPayment(null)}
        open={Boolean(detailsPayment)}
        title="Payment Details"
        summaryRows={detailsPayment ? buildPaymentSummaryRows(detailsPayment, labels) : []}
        technicalRows={detailsPayment ? buildPaymentTechnicalRows(detailsPayment) : []}
      />

      <ConfirmDialog
        confirmLabel="Mark Success"
        description={
          actionTarget
            ? `Mark payment #${actionTarget.payment.id} as SUCCESS?`
            : ''
        }
        isLoading={mockSuccessMutation.isPending}
        onClose={() => setActionTarget(null)}
        onConfirm={() => {
          if (actionTarget?.type === 'success') {
            mockSuccessMutation.mutate(actionTarget.payment.id);
          }
        }}
        open={actionTarget?.type === 'success'}
        title="Mock Payment Success"
      />

      <Dialog
        fullWidth
        maxWidth="xs"
        onClose={() => setActionTarget(null)}
        open={actionTarget?.type === 'failure'}
      >
        <DialogTitle>Mock Payment Failure</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              This will mark payment #{actionTarget?.payment.id} as FAILED.
            </Alert>
            <TextField
              label="Failure Reason"
              multiline
              minRows={3}
              onChange={(event) => setFailureReason(event.target.value)}
              required
              value={failureReason}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={mockFailureMutation.isPending} onClick={() => setActionTarget(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            disabled={mockFailureMutation.isPending}
            onClick={() => {
              if (actionTarget?.type === 'failure') {
                mockFailureMutation.mutate({
                  id: actionTarget.payment.id,
                  failureReason: failureReason.trim(),
                });
              }
            }}
            variant="contained"
          >
            Mark Failed
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}
