export type ParkingEventStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface ParkingEvent {
  id: number;
  bookingId: number;
  userId: number;
  vehicleId: number;
  slotId: number;
  parkingLotId: number;
  checkInTime: string;
  checkOutTime: string | null;
  status: ParkingEventStatus;
  durationMinutes: number | null;
  feeAmount: number | string | null;
  createdAt: string;
  updatedAt: string;
  bookingCode?: string;
  vehicleNumber?: string;
  slotNumber?: string;
  floorName?: string;
  parkingLotName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string | null;
}

export interface CheckInPayload {
  bookingCode?: string;
  bookingId?: number;
}

export interface CheckOutPayload {
  parkingEventId: number;
}

export interface PaymentSummary {
  id?: number;
  status?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  providerReference?: string | null;
}

export interface CheckOutResult {
  parkingEvent: ParkingEvent;
  paymentInitiated: boolean;
  payment?: PaymentSummary;
  paymentError?: string;
}
