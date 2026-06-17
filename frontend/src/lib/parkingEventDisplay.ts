import { formatBookingNo } from './formatters';
import { ParkingEvent } from '../types/parkingEvent';

export function getParkingEventBookingLabel(event: ParkingEvent): string {
  return event.bookingCode ?? formatBookingNo(event.bookingId);
}

export function getParkingEventCustomerLabel(event: ParkingEvent): string {
  if (event.customerName && event.customerEmail) {
    return `${event.customerName} · ${event.customerEmail}`;
  }

  if (event.customerName) {
    return event.customerName;
  }

  return `Customer #${event.userId}`;
}

export function getParkingEventVehicleLabel(event: ParkingEvent): string {
  return event.vehicleNumber ?? `Vehicle #${event.vehicleId}`;
}

export function getParkingEventParkingLotLabel(event: ParkingEvent): string {
  return event.parkingLotName ?? `Lot #${event.parkingLotId}`;
}

export function getParkingEventSlotLabel(event: ParkingEvent): string {
  return event.slotNumber ?? `Slot #${event.slotId}`;
}

export function getParkingEventFloorLabel(event: ParkingEvent): string {
  return event.floorName ?? '-';
}