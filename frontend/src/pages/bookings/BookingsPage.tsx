import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
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
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { useAuth } from '../../providers/AuthProvider';
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

function toLocalDateTimeValue(date = new Date()) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function BookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isUser = user?.role === 'USER';
  const isAdmin = user?.role === 'ADMIN';
  const canViewAll = user?.role === 'ADMIN' || user?.role === 'SECURITY';
  const [formOpen, setFormOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormState>({
    ...emptyBookingForm,
    startTime: toLocalDateTimeValue(),
  });
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', isUser ? 'my' : 'all'],
    queryFn: isUser ? getMyBookings : getBookings,
    enabled: Boolean(isUser || canViewAll),
  });
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', isAdmin ? 'all' : 'my'],
    queryFn: isAdmin ? getVehicles : getMyVehicles,
    enabled: isUser || isAdmin,
  });
  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
    enabled: Boolean(isUser || canViewAll),
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
  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );
  const parkingLotById = useMemo(
    () => new Map(parkingLots.map((parkingLot) => [parkingLot.id, parkingLot])),
    [parkingLots],
  );
  const slotById = useMemo(
    () => new Map(availableSlots.map((slot) => [slot.id, slot])),
    [availableSlots],
  );

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['parking-lots'] }),
      ]);
      setSnackbar({ message: 'Booking created.', severity: 'success' });
      setFormOpen(false);
      setBookingForm({ ...emptyBookingForm, startTime: toLocalDateTimeValue() });
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['parking-lots'] }),
      ]);
      setSnackbar({ message: 'Booking cancelled.', severity: 'success' });
      setCancelTarget(null);
    },
    onError: (error) => setSnackbar({ message: getApiErrorMessage(error), severity: 'error' }),
  });

  const columns = useMemo<GridColDef<Booking>[]>(
    () => [
      { field: 'bookingCode', flex: 1, headerName: 'Booking Code', minWidth: 220 },
      {
        field: 'parkingLotId',
        headerName: 'Parking Lot',
        minWidth: 170,
        valueGetter: (_value, row) => parkingLotById.get(row.parkingLotId)?.name ?? `Lot #${row.parkingLotId}`,
      },
      {
        field: 'vehicleId',
        headerName: 'Vehicle',
        minWidth: 170,
        valueGetter: (_value, row) =>
          vehicleById.get(row.vehicleId)?.vehicleNumber ?? `Vehicle #${row.vehicleId}`,
      },
      {
        field: 'slotId',
        headerName: 'Slot',
        minWidth: 130,
        valueGetter: (_value, row) => slotById.get(row.slotId)?.slotNumber ?? `Slot #${row.slotId}`,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        renderCell: ({ row }) => <Chip label={row.status} size="small" />,
      },
      {
        field: 'startTime',
        headerName: 'Start Time',
        minWidth: 190,
        valueGetter: (_value, row) => new Date(row.startTime).toLocaleString(),
      },
      {
        field: 'endTime',
        headerName: 'End Time',
        minWidth: 190,
        valueGetter: (_value, row) => (row.endTime ? new Date(row.endTime).toLocaleString() : '-'),
      },
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
    [isUser, parkingLotById, slotById, vehicleById],
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
      setSnackbar({ message: 'Please select a vehicle and slot.', severity: 'error' });
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

      <Snackbar autoHideDuration={3500} onClose={() => setSnackbar(null)} open={Boolean(snackbar)}>
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity ?? 'success'} variant="filled">
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
