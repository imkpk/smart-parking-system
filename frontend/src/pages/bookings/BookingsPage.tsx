import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  IconButton,
  Typography,
} from '@mui/material';
import { Add, Cancel } from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import {
  cancelBooking,
  createBooking,
  getAvailableSlotsForBooking,
  getBookings,
  getMyBookings,
} from '../../api/bookingsApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { getMyVehicles, getVehicles } from '../../api/vehiclesApi';
import { AppDataGrid } from '../../components/common/AppDataGrid';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { BookingStatusChip } from '../../components/common/BookingStatusChip';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailsDialog, DetailsRow } from '../../components/common/DetailsDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { createDetailsColumn } from '../../components/common/gridColumns';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { useReferenceLabels } from '../../hooks/useReferenceLabels';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { formatBookingNo, formatDateTime } from '../../lib/formatters';
import { Booking } from '../../types/booking';
import { VehicleType } from '../../types/vehicle';

interface BookingFormState {
  parkingLotId: number | '';
  vehicleId: number | '';
  vehicleType: VehicleType;
  slotId: number | '';
  startTime: string;
  endTime: string;
}

const emptyBookingForm: BookingFormState = {
  parkingLotId: '',
  vehicleId: '',
  vehicleType: 'CAR',
  slotId: '',
  startTime: '',
  endTime: '',
};

const activeBookingStatuses = ['PENDING', 'CONFIRMED'];

function buildBookingSummaryRows(
  booking: Booking,
  labels: ReturnType<typeof useReferenceLabels>,
  showCustomer: boolean,
): DetailsRow[] {
  const rows: DetailsRow[] = [
    { label: 'Booking No', value: formatBookingNo(booking.id) },
    { label: 'Booking Code', value: booking.bookingCode },
  ];

  if (showCustomer) {
    rows.push({ label: 'Customer', value: labels.getCustomerLabel(booking.userId) });
  }

  rows.push(
    { label: 'Vehicle Number', value: labels.getVehicleLabel(booking.vehicleId) },
    { label: 'Parking Lot', value: labels.getParkingLotLabel(booking.parkingLotId) },
    { label: 'Slot', value: labels.getSlotLabel(booking.slotId) },
    { label: 'Start Time', value: formatDateTime(booking.startTime) },
    { label: 'End Time', value: formatDateTime(booking.endTime) },
    { label: 'Status', value: <BookingStatusChip status={booking.status} /> },
  );

  return rows;
}

function buildBookingTechnicalRows(booking: Booking): DetailsRow[] {
  return [
    { label: 'bookingId', value: booking.id },
    { label: 'userId', value: booking.userId },
    { label: 'vehicleId', value: booking.vehicleId },
    { label: 'slotId', value: booking.slotId },
    { label: 'parkingLotId', value: booking.parkingLotId },
    { label: 'status', value: booking.status },
  ];
}

function toLocalDateTimeValue(date = new Date()) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function BookingsPage() {
  const { user, isAdmin, isUser, canOperateParkingEvents } = useUserRole();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const labels = useReferenceLabels({
    context: 'bookings',
    includeParkingStructure: true,
    includeUsers: isAdmin,
    role: user?.role,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormState>({
    ...emptyBookingForm,
    startTime: toLocalDateTimeValue(),
  });
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', isUser ? 'my' : 'all'],
    queryFn: isUser ? getMyBookings : getBookings,
    enabled: Boolean(isUser || canOperateParkingEvents),
  });
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', isAdmin ? 'all' : 'my'],
    queryFn: isAdmin ? getVehicles : getMyVehicles,
    enabled: isUser || isAdmin,
  });
  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
    enabled: Boolean(isUser || canOperateParkingEvents),
  });
  const availableSlotsQuery = useQuery({
    queryKey: ['parking-lots', bookingForm.parkingLotId, 'available-slots', bookingForm.vehicleType],
    queryFn: () =>
      getAvailableSlotsForBooking(Number(bookingForm.parkingLotId), bookingForm.vehicleType),
    enabled: isUser && Boolean(bookingForm.parkingLotId && bookingForm.vehicleId && bookingForm.vehicleType),
  });

  const vehicles = vehiclesQuery.data ?? [];
  const parkingLots = parkingLotsQuery.data ?? [];
  const availableSlots = availableSlotsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['parking-lots'] }),
      ]);
      showSuccess('Booking created.');
      setFormOpen(false);
      setBookingForm({ ...emptyBookingForm, startTime: toLocalDateTimeValue() });
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['parking-lots'] }),
      ]);
      showSuccess('Booking cancelled.');
      setCancelTarget(null);
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });

  const columns = useMemo<GridColDef<Booking>[]>(
    () => [
      {
        field: 'id',
        headerName: 'Booking No',
        minWidth: 150,
        valueGetter: (_value, row) => formatBookingNo(row.id),
      },
      { field: 'bookingCode', flex: 1, headerName: 'Booking Code', minWidth: 220 },
      ...(canOperateParkingEvents
        ? [
            {
              field: 'userId',
              flex: 1,
              headerName: 'Customer',
              minWidth: 220,
              valueGetter: (_value, row) => labels.getCustomerLabel(row.userId),
            } satisfies GridColDef<Booking>,
          ]
        : []),
      {
        field: 'vehicleId',
        headerName: 'Vehicle Number',
        minWidth: 170,
        valueGetter: (_value, row) => labels.getVehicleLabel(row.vehicleId),
      },
      {
        field: 'parkingLotId',
        headerName: 'Parking Lot',
        minWidth: 170,
        valueGetter: (_value, row) => labels.getParkingLotLabel(row.parkingLotId),
      },
      {
        field: 'slotId',
        headerName: 'Slot',
        minWidth: 130,
        valueGetter: (_value, row) => labels.getSlotLabel(row.slotId),
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        renderCell: ({ row }) => <BookingStatusChip status={row.status} />,
      },
      {
        field: 'startTime',
        headerName: 'Start Time',
        minWidth: 190,
        valueGetter: (_value, row) => formatDateTime(row.startTime),
      },
      {
        field: 'endTime',
        headerName: 'End Time',
        minWidth: 190,
        valueGetter: (_value, row) => formatDateTime(row.endTime),
      },
      createDetailsColumn<Booking>(setDetailsBooking),
      ...(isUser
        ? [
            {
              field: 'actions',
              align: 'right',
              filterable: false,
              headerAlign: 'right',
              headerName: 'Actions',
              minWidth: 120,
              sortable: false,
              renderCell: ({ row }) => (
                <Stack direction="row" justifyContent="flex-end" width="100%">
                  <Tooltip title="Cancel Booking">
                    <span>
                      <IconButton
                        color="error"
                        disabled={!activeBookingStatuses.includes(row.status)}
                        onClick={() => setCancelTarget(row)}
                      >
                        <Cancel />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ),
            } satisfies GridColDef<Booking>,
          ]
        : []),
    ],
    [canOperateParkingEvents, isUser, labels],
  );

  const openCreateForm = () => {
    setBookingForm({ ...emptyBookingForm, startTime: toLocalDateTimeValue() });
    setFormOpen(true);
  };

  const handleVehicleChange = (vehicleId: number) => {
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
    setBookingForm((current) => ({
      ...current,
      vehicleId,
      vehicleType: selectedVehicle?.vehicleType ?? current.vehicleType,
      slotId: '',
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bookingForm.vehicleId || !bookingForm.slotId) {
      showError('Please select a vehicle and slot.');
      return;
    }

    createMutation.mutate({
      vehicleId: Number(bookingForm.vehicleId),
      slotId: Number(bookingForm.slotId),
      startTime: new Date(bookingForm.startTime).toISOString(),
      endTime: bookingForm.endTime ? new Date(bookingForm.endTime).toISOString() : undefined,
    });
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Bookings"
        description={isUser ? 'Create, review, and cancel your parking bookings.' : 'Review parking bookings.'}
        action={
          isUser ? (
            <Button onClick={openCreateForm} startIcon={<Add />} variant="contained">
              Create Booking
            </Button>
          ) : null
        }
      />

      {bookingsQuery.error ? (
        <Alert severity={isForbiddenError(bookingsQuery.error) ? 'warning' : 'error'}>
          {isForbiddenError(bookingsQuery.error)
            ? 'Access denied.'
            : getApiErrorMessage(bookingsQuery.error, 'Could not load bookings.')}
        </Alert>
      ) : null}

      <AppDataGrid
        columns={columns}
        height="calc(100vh - 245px)"
        loading={bookingsQuery.isLoading || bookingsQuery.isFetching}
        rows={bookingsQuery.data ?? []}
      />

      <Dialog fullWidth maxWidth="sm" onClose={() => setFormOpen(false)} open={formOpen}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Create Booking</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl required>
                <InputLabel>Vehicle</InputLabel>
                <Select
                  label="Vehicle"
                  onChange={(event) => handleVehicleChange(Number(event.target.value))}
                  value={bookingForm.vehicleId}
                >
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNumber} · {vehicle.vehicleType}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl disabled required>
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  label="Vehicle Type"
                  value={bookingForm.vehicleType}
                >
                  <MenuItem value={bookingForm.vehicleType}>{bookingForm.vehicleType}</MenuItem>
                </Select>
              </FormControl>
              <FormControl required>
                <InputLabel>Parking Lot</InputLabel>
                <Select
                  label="Parking Lot"
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      parkingLotId: Number(event.target.value),
                      slotId: '',
                    }))
                  }
                  value={bookingForm.parkingLotId}
                >
                  {parkingLots.map((parkingLot) => (
                    <MenuItem key={parkingLot.id} value={parkingLot.id}>
                      {parkingLot.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl
                required
                disabled={!bookingForm.parkingLotId || !bookingForm.vehicleId || availableSlotsQuery.isLoading}
              >
                <InputLabel>Available Slot</InputLabel>
                <Select
                  label="Available Slot"
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, slotId: Number(event.target.value) }))
                  }
                  value={bookingForm.slotId}
                >
                  {availableSlots.map((slot) => (
                    <MenuItem key={slot.id} value={slot.id}>
                      {slot.slotNumber} · {slot.slotType}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {bookingForm.parkingLotId && !availableSlotsQuery.isLoading && availableSlots.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No available slots found for this parking lot and vehicle type.
                </Typography>
              ) : null}
              <TextField
                InputLabelProps={{ shrink: true }}
                label="Start Time"
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, startTime: event.target.value }))
                }
                required
                type="datetime-local"
                value={bookingForm.startTime}
              />
              <TextField
                InputLabelProps={{ shrink: true }}
                label="End Time"
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, endTime: event.target.value }))
                }
                type="datetime-local"
                value={bookingForm.endTime}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button disabled={createMutation.isPending} type="submit" variant="contained">
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <DetailsDialog
        onClose={() => setDetailsBooking(null)}
        open={Boolean(detailsBooking)}
        summaryRows={
          detailsBooking
            ? buildBookingSummaryRows(detailsBooking, labels, canOperateParkingEvents)
            : []
        }
        technicalRows={detailsBooking ? buildBookingTechnicalRows(detailsBooking) : []}
        title="Booking Details"
      />

      <ConfirmDialog
        confirmLabel="Cancel Booking"
        description={cancelTarget ? `Cancel booking ${cancelTarget.bookingCode}?` : ''}
        isLoading={cancelMutation.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) {
            cancelMutation.mutate(cancelTarget.id);
          }
        }}
        open={Boolean(cancelTarget)}
        title="Cancel Booking"
      />

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}
