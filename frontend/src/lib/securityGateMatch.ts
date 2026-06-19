import {
  SecurityGateMatchItem,
  SecurityGateSingleResult,
} from '../types/securityGate';

export function matchItemToSingleResult(match: SecurityGateMatchItem): SecurityGateSingleResult {
  return {
    resultType: 'SINGLE',
    action: match.gateAction,
    actionDisabledReason: match.actionDisabledReason,
    lastCheckOutTime: match.lastCheckOutTime,
    booking: {
      id: match.bookingId,
      bookingCode: match.bookingCode,
      status: match.bookingStatus,
      customerName: match.customerName,
      customerPhone: match.customerPhone,
      vehicleNumber: match.vehicleNumber,
      parkingLotName: match.parkingLotName,
      floorName: match.floorName,
      slotNumber: match.slotNumber,
    },
    parkingEvent: match.parkingEventId
      ? {
          id: match.parkingEventId,
          status: match.sessionStatus ?? 'ACTIVE',
          checkInTime: match.parkingEventCheckInTime ?? new Date(0).toISOString(),
        }
      : null,
    vehicleActivity: match.vehicleActivity,
    recentVisits: match.recentVisits,
  };
}