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
} from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  getPayments,
  getPaymentSummary,
  getUserPayments,
  mockPaymentFailure,
  mockPaymentSuccess,
  verifyRazorpayPayment,
} from '../../api/paymentsApi';
import type { IllustrationName } from '../../assets/illustrations';
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
import { filterPayments } from '../../lib/searchFilters';
import {
  buildVerifyRazorpayPaymentRequest,
  canShowPayNow,
} from '../../lib/paymentRazorpay';
import { openRazorpayCheckout } from '../../lib/razorpayCheckout';
import {
  formatBookingNo,
  formatCurrency,
  formatDateTime,
  formatReceiptNo,
  formatStatusLabel,
} from '../../lib/formatters';
import { Payment } from '../../types/payment';

type PaymentAction = { type: 'success' | 'failure'; payment: Payment } | null;

function buildPaymentSummaryRows(
  payment: Payment,
  labels: ReturnType<typeof useReferenceLabels>,
  showCustomer: boolean,
): DetailsRow[] {
  const rows: DetailsRow[] = [
    { label: 'Receipt No', value: formatReceiptNo(payment.id) },
    { label: 'Booking No', value: formatBookingNo(payment.bookingId) },
  ];

  if (showCustomer) {
    rows.push({ label: 'Customer', value: labels.getCustomerLabel(payment.userId) });
  }

  const vehicleNumber = labels.getVehicleLabelForBooking(payment.bookingId);
  if (vehicleNumber !== '-') {
    rows.push({ label: 'Vehicle Number', value: vehicleNumber });
  }

  rows.push(
    { label: 'Amount', value: formatCurrency(payment.amount, payment.currency) },
    { label: 'Currency', value: payment.currency },
    { label: 'Payment Status', value: <PaymentStatusChip status={payment.status} /> },
    { label: 'Provider', value: formatStatusLabel(payment.provider) },
    { label: 'Method', value: formatStatusLabel(payment.paymentMethod) },
    { label: 'Payment Reference', value: payment.providerReference ?? '-' },
  );

  if (payment.provider === 'RAZORPAY' && payment.gatewayOrderId) {
    rows.push({ label: 'Gateway Order', value: payment.gatewayOrderId });
  }

  if (payment.gatewayStatus) {
    rows.push({ label: 'Gateway Status', value: payment.gatewayStatus });
  }

  if (payment.failureReason) {
    rows.push({ label: 'Failure Reason', value: payment.failureReason });
  }

  rows.push({ label: 'Created On', value: formatDateTime(payment.createdAt) });

  return rows;
}

function buildPaymentTechnicalRows(payment: Payment): DetailsRow[] {
  return [
    { label: 'paymentId', value: payment.id },
    { label: 'parkingEventId', value: payment.parkingEventId },
    { label: 'bookingId', value: payment.bookingId },
    { label: 'userId', value: payment.userId },
    { label: 'provider', value: payment.provider },
    { label: 'gatewayOrderId', value: payment.gatewayOrderId ?? '-' },
    { label: 'gatewayStatus', value: payment.gatewayStatus ?? '-' },
    { label: 'providerReference', value: payment.providerReference ?? '-' },
    { label: 'status', value: payment.status },
    { label: 'paymentMethod', value: payment.paymentMethod },
  ];
}

export function PaymentsPage() {
  const { user, isAdmin, isSecurity, isUser, canViewOperationalPayments } = useUserRole();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [search, setSearch] = useState('');
  const [actionTarget, setActionTarget] = useState<PaymentAction>(null);
  const [detailsPayment, setDetailsPayment] = useState<Payment | null>(null);
  const [failureReason, setFailureReason] = useState('Mock provider declined payment');
  const [payingPaymentId, setPayingPaymentId] = useState<number | null>(null);

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
  const verifyRazorpayMutation = useMutation({
    mutationFn: verifyRazorpayPayment,
    onSuccess: async () => {
      await invalidatePayments();
      showSuccess('Payment completed successfully.');
      setPayingPaymentId(null);
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, 'Payment verification failed.'));
      setPayingPaymentId(null);
    },
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

  const rows = useMemo(
    () => filterPayments(baseRows, search, labels),
    [baseRows, labels, search],
  );

  const payNowAccess = useMemo(
    () => ({
      isAdmin,
      isUser,
      currentUserId: user?.id,
    }),
    [isAdmin, isUser, user?.id],
  );

  const handlePayNow = useCallback(
    async (payment: Payment) => {
      setPayingPaymentId(payment.id);

      await openRazorpayCheckout({
        payment,
        onSuccess: async (response) => {
          await verifyRazorpayMutation.mutateAsync(
            buildVerifyRazorpayPaymentRequest(payment.id, response),
          );
        },
        onDismiss: () => {
          showError('Payment was cancelled.');
          setPayingPaymentId(null);
        },
        onError: (message) => {
          showError(message);
          setPayingPaymentId(null);
        },
      });
    },
    [showError, verifyRazorpayMutation],
  );

  const columns = useMemo<GridColDef<Payment>[]>(
    () => [
      {
        field: 'id',
        headerName: 'Receipt No',
        minWidth: 130,
        valueGetter: (_value, row) => formatReceiptNo(row.id),
      },
      createBookingColumn<Payment>(),
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
        headerName: 'Vehicle Number',
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
        field: 'provider',
        headerName: 'Provider',
        minWidth: 120,
        valueGetter: (_value, row) => formatStatusLabel(row.provider),
      },
      {
        field: 'providerReference',
        flex: 1,
        headerName: 'Payment Reference',
        minWidth: 220,
        valueGetter: (_value, row) => row.providerReference ?? '-',
      },
      createDateTimeColumn<Payment>('createdAt', 'Created On', (row) => row.createdAt),
      createDetailsColumn<Payment>(setDetailsPayment),
      ...(isAdmin || isUser
        ? [
            {
              field: 'payNow',
              align: 'right',
              filterable: false,
              headerAlign: 'right',
              headerName: 'Pay',
              minWidth: 120,
              sortable: false,
              renderCell: ({ row }) =>
                canShowPayNow(row, payNowAccess) ? (
                  <Button
                    disabled={
                      payingPaymentId === row.id ||
                      verifyRazorpayMutation.isPending
                    }
                    onClick={() => void handlePayNow(row)}
                    size="small"
                    variant="contained"
                  >
                    Pay Now
                  </Button>
                ) : null,
            } satisfies GridColDef<Payment>,
          ]
        : []),
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
                        disabled={row.status !== 'INITIATED' || row.provider !== 'MOCK'}
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
                        disabled={row.status !== 'INITIATED' || row.provider !== 'MOCK'}
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
    [
      isAdmin,
      isSecurity,
      isUser,
      labels,
      payNowAccess,
      payingPaymentId,
      verifyRazorpayMutation.isPending,
      handlePayNow,
    ],
  );

  const paymentError = isUser ? userPaymentsQuery.error : paymentsQuery.error;
  const isPaymentLoading =
    paymentsQuery.isLoading ||
    paymentsQuery.isFetching ||
    userPaymentsQuery.isLoading ||
    userPaymentsQuery.isFetching;
  const paymentEmptyState: {
    description: string;
    illustration: IllustrationName;
    title: string;
  } = isAdmin
    ? {
        description: search
          ? 'Try a receipt no, booking no, vehicle number, status, or payment reference.'
          : 'Payments will appear here after parking check-outs.',
        illustration: search ? 'empty' : 'payments',
        title: search ? 'No matching payments' : 'No payments found',
      }
    : isSecurity
      ? {
          description: search
            ? 'Try a receipt no, booking no, vehicle number, or status.'
            : 'Operational payments will appear here after check-outs.',
          illustration: search ? 'empty' : 'receipt',
          title: search ? 'No matching payments' : 'No operational payments found',
        }
      : {
          description: search
            ? 'Try a receipt no, booking no, or status from your history.'
            : 'Your payment history will appear here after parking sessions.',
          illustration: search ? 'empty' : 'receipt',
          title: search ? 'No matching payments' : 'You have no payment history yet',
        };
  const summary = summaryQuery.data;
  const summaryStatuses = summary?.paymentsByStatus ?? {};

  return (
    <Stack spacing={1}>
      <PageHeader title="Payments" />

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

      <QueryErrorAlert error={paymentError} fallbackMessage="Could not load payments." />

      <AppDataGrid
        columns={columns}
        emptyState={paymentEmptyState}
        height={520}
        loading={isPaymentLoading}
        rows={rows}
        search={{
          onChange: (event) => setSearch(event.target.value),
          onClear: () => setSearch(''),
          placeholder: 'Search by receipt no, booking no, vehicle number, status, or payment reference',
          value: search,
        }}
      />

      <DetailsDialog
        onClose={() => setDetailsPayment(null)}
        open={Boolean(detailsPayment)}
        title="Payment Details"
        summaryRows={
          detailsPayment
            ? buildPaymentSummaryRows(detailsPayment, labels, isAdmin || isSecurity)
            : []
        }
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
