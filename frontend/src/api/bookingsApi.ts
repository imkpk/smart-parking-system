import { Booking, BookingPayload } from '../types/booking';
import { VehicleType } from '../types/vehicle';
import { Slot } from '../types/slot';
import { apiClient } from './client';

export async function getAvailableSlotsForBooking(parkingLotId: number, vehicleType: VehicleType) {
  const response = await apiClient.get<Slot[]>(`/parking-lots/${parkingLotId}/available-slots`, {
    params: { vehicleType },
  });
  return response.data;
}

export async function createBooking(payload: BookingPayload) {
  const response = await apiClient.post<Booking>('/bookings', payload);
  return response.data;
}

export async function getMyBookings() {
  const response = await apiClient.get<Booking[]>('/bookings/my');
  return response.data;
}

export async function getBookings() {
  const response = await apiClient.get<Booking[]>('/bookings');
  return response.data;
}

export async function getBooking(id: number) {
  const response = await apiClient.get<Booking>(`/bookings/${id}`);
  return response.data;
}

export async function cancelBooking(id: number) {
  const response = await apiClient.post<Booking>(`/bookings/${id}/cancel`);
  return response.data;
}
