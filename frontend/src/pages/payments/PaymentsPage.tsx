import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { CheckCircle, ErrorOutline, Payments, ReceiptLong, Search } from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import {
  getPayment,
  getPaymentSummary,
  getUserPayments,
  mockPaymentFailure,
  mockPaymentSuccess,
} from '../../api/paymentsApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { PaymentStatusChip } from '../../components/common/PaymentStatusChip';
import { StatCard } from '../../components/common/StatCard';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { paymentStatusStyles } from '../../lib/paymentStatusStyles';
import { useAuth } from '../../providers/AuthProvider';
import { Payment } from '../../types/payment';

type SnackbarState = { message: string; severity: 'success' | 'error' } | null;
type PaymentAction = { type: 'success' | 'failure'; payment: Payment } | null;

function formatCurrency(amount: number | string | null | undefined, currency = 'INR') {
  if (amount === null || amount === undefined) {
    return '-';
  }

  return `${currency} ${Number(amount).toFixed(2)}`;
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function PaymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const isUser = user?.role === 'USER';
  const [paymentIdInput, setPaymentIdInput] = useState('');
  const [lookupPaymentId, setLookupPaymentId] = useState<number | null>(null);
  const [actionTarget, setActionTarget] = useState<PaymentAction>(null);
  const [failureReason, setFailureReason] = useState('Mock provider declined payment');
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const summaryQuery = useQuery({
    queryKey: ['payments', 'summary'],
    queryFn: getPaymentSummary,
    enabled: isAdmin,
  });
  const userPaymentsQuery = useQuery({
    queryKey: ['payments', 'user', user?.id],
    queryFn: () => getUserPayments(user!.id),
    enabled: isUser && Boolean(user?.id),
  });
  const lookupPaymentQuery = useQuery({
    queryKey: ['payments', 'lookup', lookupPaymentId],
    queryFn: () => getPayment(lookupPaymentId!),
    enabled: isAdmin && Boolean(lookupPaymentId),
  });

  const invalidatePayments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['parking-events'] }),
    ]);
  };

  const mockSuccessMutation = useMutation({
    mutationFn: mockPaymentSuccess,
    onSuccess: async () => {
      await invalidatePayments();
      setSnackbar({ message: 'Payment marked SUCCESS.', severity: 'success' });
      setActionTarget(null);
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });
  const mockFailureMutation = useMutation({
    mutationFn: mockPaymentFailure,
    onSuccess: async () => {
      await invalidatePayments();
      setSnackbar({ message: 'Payment marked FAILED.', severity: 'success' });
      setActionTarget(null);
      setFailureReason('Mock provider declined payment');
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });

  const rows = useMemo(() => {
    if (isUser) {
      return userPaymentsQuery.data ?? [];
    }

    return lookupPaymentQuery.data ? [lookupPaymentQuery.data] : [];
  }, [isUser, lookupPaymentQuery.data, userPaymentsQuery.data]);

  const columns = useMemo<GridColDef<Payment>[]>(
    () => [
      { field: 'id', headerName: 'Payment ID', minWidth: 120 },
      { field: 'parkingEventId', headerName: 'Event ID', minWidth: 120 },
      { field: 'bookingId', headerName: 'Booking ID', minWidth: 120 },
      { field: 'userId', headerName: 'User ID', minWidth: 110 },
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
        headerName: 'Provider Reference',
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
      {
        field: 'createdAt',
        headerName: 'Created At',
        minWidth: 190,
        valueGetter: (_value, row) => formatDateTime(row.createdAt),
      },
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
    [isAdmin],
  );

  const handleLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const paymentId = Number(paymentIdInput);

    if (!paymentId || paymentId < 1) {
      setSnackbar({ message: 'Enter a valid payment ID.', severity: 'error' });
      return;
    }

    setLookupPaymentId(paymentId);
  };

  const paymentError = isUser ? userPaymentsQuery.error : lookupPaymentQuery.error;
  const isPaymentLoading =
    userPaymentsQuery.isLoading ||
    userPaymentsQuery.isFetching ||
    lookupPaymentQuery.isLoading ||
    lookupPaymentQuery.isFetching;
  const summary = summaryQuery.data;
  const summaryStatuses = summary?.paymentsByStatus ?? {};

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Payments"
        description={
          isAdmin
            ? 'Review payment totals and update mock payment outcomes.'
            : 'Review your parking payment history.'
        }
      />

      {summaryQuery.error ? (
        <Alert severity={isForbiddenError(summaryQuery.error) ? 'warning' : 'error'}>
          {isForbiddenError(summaryQuery.error)
            ? 'Access denied.'
            : getApiErrorMessage(summaryQuery.error, 'Could not load payment summary.')}
        </Alert>
      ) : null}

      {isAdmin ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              icon={<ReceiptLong />}
              label="Total Payments"
              value={summary?.totalPayments ?? 0}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              accentColor="success.main"
              icon={<Payments />}
              iconBgcolor="rgba(46, 125, 50, 0.1)"
              label="Successful Amount"
              value={formatCurrency(summary?.successfulAmount ?? 0)}
            />
          </Grid>
          {(['INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'] as const).map((status) => {
            const statusStyle = paymentStatusStyles[status];

            return (
              <Grid item key={status} xs={12} sm={6} lg={3}>
                <StatCard
                  label={statusStyle.label}
                  value={summaryStatuses[status] ?? 0}
                />
              </Grid>
            );
          })}
        </Grid>
      ) : null}

      {isAdmin ? (
        <Box component="form" onSubmit={handleLookup}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Payment ID"
              onChange={(event) => setPaymentIdInput(event.target.value)}
              type="number"
              value={paymentIdInput}
            />
            <Button
              disabled={lookupPaymentQuery.isFetching}
              startIcon={<Search />}
              type="submit"
              variant="contained"
              sx={{ minWidth: 150 }}
            >
              Find
            </Button>
          </Stack>
        </Box>
      ) : null}

      {paymentError ? (
        <Alert severity={isForbiddenError(paymentError) ? 'warning' : 'error'}>
          {isForbiddenError(paymentError)
            ? 'Access denied.'
            : getApiErrorMessage(paymentError, 'Could not load payments.')}
        </Alert>
      ) : null}

      <AppDataGrid
        columns={columns}
        height="calc(100vh - 360px)"
        loading={isPaymentLoading}
        rows={rows}
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

      <Snackbar autoHideDuration={3500} onClose={() => setSnackbar(null)} open={Boolean(snackbar)}>
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity ?? 'success'} variant="filled">
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
