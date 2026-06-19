import { BookingStatus } from './booking';
import { ParkingEventStatus } from './parkingEvent';

export type SecurityGateAction = 'CHECK_IN' | 'CHECK_OUT' | 'NONE';

export interface SecurityGateSearchResult {
  action: SecurityGateAction;
  actionDisabledReason: string | null;
  booking: {
    id: number;
    bookingCode: string;
    status: BookingStatus;
    customerName: string;
    vehicleNumber: string;
    parkingLotName: string;
    floorName: string;
    slotNumber: string;
  };
  parkingEvent: {
    id: number;
    status: ParkingEventStatus;
    checkInTime: string;
  } | null;
}