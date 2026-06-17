import {
  formatBookingNo,
  formatReceiptNo,
  formatSessionNo,
  formatStatusLabel,
} from './formatters';
import { Booking } from '../types/booking';
import { ParkingEvent } from '../types/parkingEvent';
import { ParkingLot } from '../types/parkingLot';
import { Payment } from '../types/payment';
import { Slot } from '../types/slot';
import { Vehicle } from '../types/vehicle';

export type ReferenceLabels = {
  getBookingCode: (bookingId: number) => string | undefined;
  getCustomerLabel: (userId: number) => string;
  getParkingLotLabel: (parkingLotId: number) => string;
  getSlotLabel: (slotId: number) => string;
  getVehicleLabel: (vehicleId: number) => string;
  getVehicleLabelForBooking: (bookingId: number) => string;
};

export function matchesSearch(
  query: string,
  values: Array<string | number | null | undefined>,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

export function getPaymentSearchValues(payment: Payment, labels: ReferenceLabels) {
  return [
    formatReceiptNo(payment.id),
    payment.id,
    formatBookingNo(payment.bookingId),
    payment.bookingId,
    labels.getBookingCode(payment.bookingId),
    labels.getCustomerLabel(payment.userId),
    labels.getVehicleLabelForBooking(payment.bookingId),
    formatSessionNo(payment.parkingEventId),
    payment.parkingEventId,
    payment.status,
    formatStatusLabel(payment.status),
    payment.paymentMethod,
    formatStatusLabel(payment.paymentMethod),
    payment.provider,
    formatStatusLabel(payment.provider),
    payment.gatewayOrderId,
    payment.providerReference,
    payment.currency,
    payment.failureReason,
  ];
}

export function filterPayments(
  payments: Payment[],
  query: string,
  labels: ReferenceLabels,
) {
  return payments.filter((payment) =>
    matchesSearch(query, getPaymentSearchValues(payment, labels)),
  );
}

export function getParkingEventSearchValues(event: ParkingEvent) {
  return [
    formatSessionNo(event.id),
    event.id,
    formatBookingNo(event.bookingId),
    event.bookingId,
    event.bookingCode,
    event.customerName,
    event.customerEmail,
    event.customerPhone,
    event.vehicleNumber,
    event.parkingLotName,
    event.floorName,
    event.slotNumber,
    event.status,
    formatStatusLabel(event.status),
  ];
}

export function filterParkingEvents(events: ParkingEvent[], query: string) {
  return events.filter((event) =>
    matchesSearch(query, getParkingEventSearchValues(event)),
  );
}

export function getBookingSearchValues(booking: Booking, labels: ReferenceLabels) {
  return [
    formatBookingNo(booking.id),
    booking.id,
    booking.bookingCode,
    labels.getCustomerLabel(booking.userId),
    labels.getVehicleLabel(booking.vehicleId),
    labels.getParkingLotLabel(booking.parkingLotId),
    labels.getSlotLabel(booking.slotId),
    booking.status,
    formatStatusLabel(booking.status),
  ];
}

export function filterBookings(bookings: Booking[], query: string, labels: ReferenceLabels) {
  return bookings.filter((booking) =>
    matchesSearch(query, getBookingSearchValues(booking, labels)),
  );
}

export function getVehicleSearchValues(
  vehicle: Vehicle,
  labels: ReferenceLabels,
  includeOwner: boolean,
) {
  const values = [
    vehicle.vehicleNumber,
    vehicle.vehicleType,
    formatStatusLabel(vehicle.vehicleType),
    vehicle.brand,
    vehicle.model,
    vehicle.color,
  ];

  if (includeOwner) {
    values.push(labels.getCustomerLabel(vehicle.userId));
  }

  return values;
}

export function filterVehicles(
  vehicles: Vehicle[],
  query: string,
  labels: ReferenceLabels,
  includeOwner: boolean,
) {
  return vehicles.filter((vehicle) =>
    matchesSearch(query, getVehicleSearchValues(vehicle, labels, includeOwner)),
  );
}

export function getParkingLotSearchValues(parkingLot: ParkingLot) {
  return [
    parkingLot.name,
    parkingLot.type,
    formatStatusLabel(parkingLot.type),
    parkingLot.address,
    parkingLot.city,
    parkingLot.state,
    parkingLot.pincode,
    parkingLot.isActive ? 'active' : 'inactive',
  ];
}

export function filterParkingLots(parkingLots: ParkingLot[], query: string) {
  return parkingLots.filter((parkingLot) =>
    matchesSearch(query, getParkingLotSearchValues(parkingLot)),
  );
}

export function getSlotSearchValues(
  slot: Slot,
  floorName: string,
  parkingLotName: string,
) {
  return [
    slot.slotNumber,
    floorName,
    parkingLotName,
    slot.slotType,
    formatStatusLabel(slot.slotType),
    slot.status,
    formatStatusLabel(slot.status),
  ];
}

export function filterSlots(
  slots: Slot[],
  query: string,
  floorNameById: Map<number, string>,
  parkingLotName: string,
) {
  return slots.filter((slot) =>
    matchesSearch(
      query,
      getSlotSearchValues(
        slot,
        floorNameById.get(slot.floorId) ?? '',
        parkingLotName,
      ),
    ),
  );
}