import { formatDateTime, formatSessionNo } from './formatters';
import { formatVehicleNumber } from './vehicleNumber';
import { SecurityGateSingleResult } from '../types/securityGate';

const ACCESS_LOT_PATTERN = /^access\s+lot\s+\d+$/i;

export function isReadableParkingLotName(name: string | undefined) {
  if (!name?.trim()) {
    return false;
  }

  const trimmed = name.trim();

  if (ACCESS_LOT_PATTERN.test(trimmed)) {
    return false;
  }

  return !/\d{6,}/.test(trimmed);
}

export function buildGateConfirmDescription(result: SecurityGateSingleResult) {
  const { booking, parkingEvent } = result;
  const lotSuffix = isReadableParkingLotName(booking.parkingLotName)
    ? ` at ${booking.parkingLotName}`
    : '';

  if (result.action === 'CHECK_IN') {
    const returnLine = result.lastCheckOutTime
      ? `\n\nLast checked out ${formatDateTime(result.lastCheckOutTime)}. Slot is available now.`
      : '';

    return `Check in vehicle ${formatVehicleNumber(booking.vehicleNumber)} to slot ${booking.slotNumber}${lotSuffix}?${returnLine}`;
  }

  if (result.action === 'CHECK_OUT' && parkingEvent) {
    const sessionLine = `Session ${formatSessionNo(parkingEvent.id)} · Checked in ${formatDateTime(parkingEvent.checkInTime)}`;

    return `Check out vehicle ${formatVehicleNumber(booking.vehicleNumber)} from slot ${booking.slotNumber}?\n\n${sessionLine}`;
  }

  return '';
}