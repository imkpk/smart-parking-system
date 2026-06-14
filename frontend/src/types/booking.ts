export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

export interface Booking {
  id: number;
  userId: number;
  vehicleId: number;
  slotId: number;
  parkingLotId: number;
  status: BookingStatus;
  startTime: string;
  endTime: string | null;
  bookingCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPayload {
  vehicleId: number;
  slotId: number;
  startTime: string;
  endTime?: string;
}
