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
import { HeaderActionButton, PageHeader } from '../../components/common/PageHeader';

import { createDetailsColumn } from '../../components/common/gridColumns';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import {
  getBookingCustomerLabel,
  getBookingFloorLabel,
  getBookingParkingLotLabel,
  getBookingSlotLabel,
  getBookingVehicleLabel,
} from '../../lib/bookingDisplay';
import { formatBookingNo, formatDateTime } from '../../lib/formatters';
import { filterBookings } from '../../lib/searchFilters';
import { userFacingLabels } from '../../lib/userFacingLabels';
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
  showCustomer: boolean,
): DetailsRow[] {
  const rows: DetailsRow[] = [
    { label: 'Booking No', value: formatBookingNo(booking.id) },
    { label: 'Booking Code', value: booking.bookingCode },
  ];

  if (showCustomer) {
    rows.push({ label: 'Customer', value: getBookingCustomerLabel(booking) });
  }

  rows.push(
    { label: 'Vehicle Number', value: getBookingVehicleLabel(booking) },
    { label: 'Parking Lot', value: getBookingParkingLotLabel(booking) },
    { label: 'Floor', value: getBookingFloorLabel(booking) },
    { label: 'Slot', value: getBookingSlotLabel(booking) },
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
    { label: 'floorId', value: booking.floorId ?? '-' },
    { label: 'status', value: booking.status },
  ];
}

function toLocalDateTimeValue(date = new Date()) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function BookingsPage() {
  const { isAdmin, isUser, canOperateParkingEvents } = useUserRole();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [formOpen, setFormOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormState>({
    ...emptyBookingForm,
    startTime: toLocalDateTimeValue(),
  });
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const [search, setSearch] = useState('');

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

  const bookingRows = useMemo(
    () => filterBookings(bookingsQuery.data ?? [], search),
    [bookingsQuery.data, search],
  );

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
              field: 'customerName',
              flex: 1,
              headerName: 'Customer',
              minWidth: 220,
              valueGetter: (_value, row) => getBookingCustomerLabel(row),
            } satisfies GridColDef<Booking>,
          ]
        : []),
      {
        field: 'vehicleNumber',
        headerName: 'Vehicle Number',
        minWidth: 170,
        valueGetter: (_value, row) => getBookingVehicleLabel(row),
      },
      {
        field: 'parkingLotName',
        headerName: 'Parking Lot',
        minWidth: 170,
        valueGetter: (_value, row) => getBookingParkingLotLabel(row),
      },
      {
        field: 'floorName',
        headerName: 'Floor',
        minWidth: 120,
        valueGetter: (_value, row) => getBookingFloorLabel(row),
      },
      {
        field: 'slotNumber',
        headerName: 'Slot',
        minWidth: 130,
        valueGetter: (_value, row) => getBookingSlotLabel(row),
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
    [canOperateParkingEvents, isUser],
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

  const pageTitle = isUser ? userFacingLabels.bookings : 'Bookings';
  const bookSlotLabel = userFacingLabels.bookSlot;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={pageTitle}
        action={
          isUser ? (
            <HeaderActionButton onClick={openCreateForm} startIcon={<Add />}>
              {bookSlotLabel}
            </HeaderActionButton>
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
        emptyState={{
          description: search
            ? 'Try a booking code, vehicle number, parking lot, or status.'
            : isUser
              ? 'Book a slot to reserve parking before you arrive.'
              : 'Bookings will appear here when customers reserve slots.',
          illustration: search ? 'empty' : 'booking',
          title: search
            ? 'No matching bookings'
            : isUser
              ? 'No parking slots booked yet'
              : 'No bookings found',
        }}
        loading={bookingsQuery.isLoading || bookingsQuery.isFetching}
        rows={bookingRows}
        search={{
          onChange: (event) => setSearch(event.target.value),
          onClear: () => setSearch(''),
          placeholder:
            'Search by booking no, booking code, customer, vehicle number, parking lot, floor, slot, or status',
          value: search,
        }}
      />

      <Dialog fullWidth maxWidth="sm" onClose={() => setFormOpen(false)} open={formOpen}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{isUser ? bookSlotLabel : 'Create Booking'}</DialogTitle>
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
            ? buildBookingSummaryRows(detailsBooking, canOperateParkingEvents)
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