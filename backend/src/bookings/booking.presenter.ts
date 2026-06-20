import { Prisma } from '@prisma/client';

export const bookingListInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      vehicleNumber: true,
    },
  },
  parkingLot: {
    select: {
      id: true,
      name: true,
    },
  },
  slot: {
    select: {
      id: true,
      slotNumber: true,
      floor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof bookingListInclude;
}>;

export type BookingListItem = Omit<
  BookingWithRelations,
  'user' | 'vehicle' | 'parkingLot' | 'slot'
> & {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  vehicleNumber: string;
  parkingLotName: string;
  slotNumber: string;
  floorId: number;
  floorName: string;
};

export function presentBooking(booking: BookingWithRelations): BookingListItem {
  const { user, vehicle, parkingLot, slot, ...core } = booking;

  return {
    ...core,
    customerName: user.name,
    customerEmail: user.email ?? '',
    customerPhone: user.phone,
    vehicleNumber: vehicle.vehicleNumber,
    parkingLotName: parkingLot.name,
    slotNumber: slot.slotNumber,
    floorId: slot.floor.id,
    floorName: slot.floor.name,
  };
}

export function presentBookings(bookings: BookingWithRelations[]): BookingListItem[] {
  return bookings.map(presentBooking);
}