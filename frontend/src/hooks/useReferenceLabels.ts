import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getBookings, getMyBookings } from '../api/bookingsApi';
import { getParkingLots } from '../api/parkingLotsApi';
import { getSlots } from '../api/slotsApi';
import { getUsers } from '../api/usersApi';
import { getMyVehicles, getVehicles } from '../api/vehiclesApi';
import { asMap } from '../lib/collection';
import { formatBookingNo, formatSessionNo } from '../lib/formatters';
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
  /** When set, loads slots only for these lots instead of every lot in the tenant. */
  parkingLotIds?: number[];
}

const REFERENCE_LABEL_STALE_MS = 5 * 60 * 1000;

export function useReferenceLabels({
  context,
  includeParkingStructure = false,
  includeUsers = false,
  role,
  parkingLotIds,
}: ReferenceLabelOptions) {
  const isAdmin = role === 'ADMIN';
  const isSecurity = role === 'SECURITY';
  const isUser = role === 'USER';
  const canUseOperationalData = isAdmin || isSecurity;
  const canLoadParkingStructure =
    includeParkingStructure && (canUseOperationalData || isUser);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', isUser ? 'my' : 'all', context],
    queryFn: isUser ? getMyBookings : getBookings,
    enabled: Boolean(isUser || canUseOperationalData),
    staleTime: REFERENCE_LABEL_STALE_MS,
  });

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', isUser ? 'my' : 'all', context],
    queryFn: isUser ? getMyVehicles : getVehicles,
    enabled: Boolean(isUser || isAdmin),
    staleTime: REFERENCE_LABEL_STALE_MS,
  });

  const usersQuery = useQuery({
    queryKey: ['users', context],
    queryFn: getUsers,
    enabled: includeUsers && isAdmin,
    staleTime: REFERENCE_LABEL_STALE_MS,
  });

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots', context],
    queryFn: getParkingLots,
    enabled: canLoadParkingStructure,
    staleTime: REFERENCE_LABEL_STALE_MS,
  });

  const resolvedParkingLotIds = useMemo(() => {
    if (parkingLotIds?.length) {
      return [...new Set(parkingLotIds)].sort((left, right) => left - right);
    }

    return (parkingLotsQuery.data ?? [])
      .map((lot) => lot.id)
      .sort((left, right) => left - right);
  }, [parkingLotIds, parkingLotsQuery.data]);

  const slotsQuery = useQuery({
    queryKey: ['slots', context, resolvedParkingLotIds.join(',')],
    queryFn: async () => {
      const nestedSlots = await Promise.all(
        resolvedParkingLotIds.map((lotId) => getSlots(lotId)),
      );
      return nestedSlots.flat();
    },
    enabled: canLoadParkingStructure && resolvedParkingLotIds.length > 0,
    staleTime: REFERENCE_LABEL_STALE_MS,
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
        bookingById.get(bookingId)?.bookingCode ?? formatBookingNo(bookingId),
      getCustomerLabel: (userId: number) => {
        const customer = userById.get(userId);
        return customer ? `${customer.name} · ${customer.email}` : `Customer #${userId}`;
      },
      getParkingLotLabel: (parkingLotId: number) =>
        parkingLotById.get(parkingLotId)?.name ?? `Lot #${parkingLotId}`,
      getSessionLabel: (sessionId: number) => formatSessionNo(sessionId),
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
