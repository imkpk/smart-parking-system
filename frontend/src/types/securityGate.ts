import { BookingStatus } from './booking';
import { ParkingEventStatus } from './parkingEvent';

export type SecurityGateAction = 'CHECK_IN' | 'CHECK_OUT' | 'NONE';

export interface VehicleVisitActivity {
  todayVisits: number;
  last7DaysVisits: number;
  last30DaysVisits: number;
  last365DaysVisits: number;
  lastVisitAt: string | null;
  lastCheckoutAt: string | null;
}

export interface SecurityGateRecentVisit {
  sessionNo: string;
  parkingLotName: string;
  slotNumber: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: ParkingEventStatus;
}

export interface SecurityGateBookingDetails {
  id: number;
  bookingCode: string;
  status: BookingStatus;
  customerName: string;
  customerPhone: string | null;
  vehicleNumber: string;
  parkingLotName: string;
  floorName: string;
  slotNumber: string;
}

export interface SecurityGateSingleResult {
  resultType: 'SINGLE';
  action: SecurityGateAction;
  actionDisabledReason: string | null;
  lastCheckOutTime: string | null;
  booking: SecurityGateBookingDetails;
  parkingEvent: {
    id: number;
    status: ParkingEventStatus;
    checkInTime: string;
  } | null;
  vehicleActivity: VehicleVisitActivity;
  recentVisits: SecurityGateRecentVisit[];
}

export interface SecurityGateMatchItem {
  bookingNo: string;
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerPhone: string | null;
  vehicleNumber: string;
  parkingLotName: string;
  floorName: string;
  slotNumber: string;
  bookingStatus: BookingStatus;
  sessionStatus: ParkingEventStatus | null;
  gateAction: SecurityGateAction;
  actionDisabledReason: string | null;
  parkingEventId: number | null;
  parkingEventCheckInTime: string | null;
  lastCheckOutTime: string | null;
  vehicleActivity: VehicleVisitActivity;
  recentVisits: SecurityGateRecentVisit[];
}

export interface SecurityGateMultipleMatchesResult {
  resultType: 'MULTIPLE_MATCHES';
  matches: SecurityGateMatchItem[];
}

export type SecurityGateSearchResponse =
  | SecurityGateSingleResult
  | SecurityGateMultipleMatchesResult;

/** @deprecated Use SecurityGateSingleResult */
export type SecurityGateSearchResult = SecurityGateSingleResult;