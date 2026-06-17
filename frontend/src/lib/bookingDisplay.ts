import { Booking } from '../types/booking';

export function getBookingCustomerLabel(booking: Booking): string {
  if (booking.customerName && booking.customerEmail) {
    return `${booking.customerName} · ${booking.customerEmail}`;
  }

  if (booking.customerName) {
    return booking.customerName;
  }

  return `Customer #${booking.userId}`;
}

export function getBookingVehicleLabel(booking: Booking): string {
  return booking.vehicleNumber ?? `Vehicle #${booking.vehicleId}`;
}

export function getBookingParkingLotLabel(booking: Booking): string {
  return booking.parkingLotName ?? `Lot #${booking.parkingLotId}`;
}

export function getBookingFloorLabel(booking: Booking): string {
  return booking.floorName ?? '-';
}

export function getBookingSlotLabel(booking: Booking): string {
  return booking.slotNumber ?? `Slot #${booking.slotId}`;
}