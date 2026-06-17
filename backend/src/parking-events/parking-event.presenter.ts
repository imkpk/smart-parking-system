import { Prisma } from '@prisma/client';

export const parkingEventListInclude = {
  booking: {
    select: {
      id: true,
      bookingCode: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      vehicleNumber: true,
    },
  },
  slot: {
    select: {
      id: true,
      slotNumber: true,
    },
  },
  parkingLot: {
    select: {
      id: true,
      name: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.ParkingEventInclude;

export type ParkingEventWithRelations = Prisma.ParkingEventGetPayload<{
  include: typeof parkingEventListInclude;
}>;

export type ParkingEventListItem = Omit<ParkingEventWithRelations, 'booking' | 'vehicle' | 'slot' | 'parkingLot' | 'user'> & {
  bookingCode: string;
  vehicleNumber: string;
  slotNumber: string;
  parkingLotName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
};

export function presentParkingEvent(event: ParkingEventWithRelations): ParkingEventListItem {
  const { booking, vehicle, slot, parkingLot, user, ...core } = event;

  return {
    ...core,
    bookingCode: booking.bookingCode,
    vehicleNumber: vehicle.vehicleNumber,
    slotNumber: slot.slotNumber,
    parkingLotName: parkingLot.name,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: user.phone,
  };
}

export function presentParkingEvents(events: ParkingEventWithRelations[]): ParkingEventListItem[] {
  return events.map(presentParkingEvent);
}