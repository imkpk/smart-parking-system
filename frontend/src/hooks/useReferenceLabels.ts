import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getBookings, getMyBookings } from '../api/bookingsApi';
import { getParkingLots } from '../api/parkingLotsApi';
import { getSlots } from '../api/slotsApi';
import { getUsers } from '../api/usersApi';
import { getMyVehicles, getVehicles } from '../api/vehiclesApi';
import { asMap } from '../lib/collection';
import { Role, User } from '../types/auth';
import { Booking } from '../types/booking';
import { ParkingLot } from '../types/parkingLot';
import { Slot } from '../types/slot';
import { Vehicle } from '../types/vehicle';

interface ReferenceLabelOptions {
  context: string;
  includeParkingStructure?: boolean;
  includeUsers?: boolean;
  role?: Role;
}

export function useReferenceLabels({
  context,
  includeParkingStructure = false,
  includeUsers = false,
  role,
}: ReferenceLabelOptions) {
  const isAdmin = role === 'ADMIN';
  const isSecurity = role === 'SECURITY';
  const isUser = role === 'USER';
  const canUseOperationalData = isAdmin || isSecurity;

  const bookingsQuery = useQuery({
    queryKey: ['bookings', isUser ? 'my' : 'all', context],
    queryFn: isUser ? getMyBookings : getBookings,
    enabled: Boolean(isUser || canUseOperationalData),
  });

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', isUser ? 'my' : 'all', context],
    queryFn: isUser ? getMyVehicles : getVehicles,
    enabled: Boolean(isUser || isAdmin),
  });

  const usersQuery = useQuery({
    queryKey: ['users', context],
    queryFn: getUsers,
    enabled: includeUsers && isAdmin,
  });

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots', context],
    queryFn: getParkingLots,
    enabled: includeParkingStructure && canUseOperationalData,
  });

  const slotsQuery = useQuery({
    queryKey: ['slots', context, parkingLotsQuery.data?.map((lot) => lot.id).join(',')],
    queryFn: async () => {
      const lots = parkingLotsQuery.data ?? [];
      const nestedSlots = await Promise.all(lots.map((lot) => getSlots(lot.id)));
      return nestedSlots.flat();
    },
    enabled: includeParkingStructure && Boolean(parkingLotsQuery.data?.length),
  });

  const bookingById = useMemo(() => asMap<Booking>(bookingsQuery.data), [bookingsQuery.data]);
  const vehicleById = useMemo(() => asMap<Vehicle>(vehiclesQuery.data), [vehiclesQuery.data]);
  const userById = useMemo(() => asMap<User>(usersQuery.data), [usersQuery.data]);
  const parkingLotById = useMemo(
    () => asMap<ParkingLot>(parkingLotsQuery.data),
    [parkingLotsQuery.data],
  );
  const slotById = useMemo(() => asMap<Slot>(slotsQuery.data), [slotsQuery.data]);

  return useMemo(
    () => ({
      bookingById,
      vehicleById,
      userById,
      parkingLotById,
      slotById,
      getBookingCode: (bookingId: number) => bookingById.get(bookingId)?.bookingCode,
      getBookingLabel: (bookingId: number) =>
        bookingById.get(bookingId)?.bookingCode ?? `Booking #${bookingId}`,
      getCustomerLabel: (userId: number) => {
        const customer = userById.get(userId);
        return customer ? `${customer.name} · ${customer.email}` : `Customer #${userId}`;
      },
      getParkingLotLabel: (parkingLotId: number) =>
        parkingLotById.get(parkingLotId)?.name ?? `Lot #${parkingLotId}`,
      getSessionLabel: (sessionId: number) => `Session #${sessionId}`,
      getSlotLabel: (slotId: number) => slotById.get(slotId)?.slotNumber ?? `Slot #${slotId}`,
      getVehicleLabel: (vehicleId: number) =>
        vehicleById.get(vehicleId)?.vehicleNumber ?? `Vehicle #${vehicleId}`,
      getVehicleLabelForBooking: (bookingId: number) => {
        const booking = bookingById.get(bookingId);
        if (!booking) {
          return '-';
        }

        return vehicleById.get(booking.vehicleId)?.vehicleNumber ?? `Vehicle #${booking.vehicleId}`;
      },
    }),
    [bookingById, parkingLotById, slotById, userById, vehicleById],
  );
}
