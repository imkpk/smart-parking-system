import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAvailableSlotsForBooking, getBookings } from '../../api/bookingsApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { getSlots } from '../../api/slotsApi';
import { getVehicles } from '../../api/vehiclesApi';
import { useAuth } from '../../providers/AuthProvider';
import { createMockUser, renderWithProviders } from '../../test/test-utils';
import { Booking } from '../../types/booking';
import { BookingsPage } from './BookingsPage';

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../api/bookingsApi', () => ({
  getBookings: vi.fn(),
  getMyBookings: vi.fn(),
  getAvailableSlotsForBooking: vi.fn(),
  createBooking: vi.fn(),
  cancelBooking: vi.fn(),
}));

vi.mock('../../api/vehiclesApi', () => ({
  getVehicles: vi.fn(),
  getMyVehicles: vi.fn(),
}));

vi.mock('../../api/parkingLotsApi', () => ({
  getParkingLots: vi.fn(),
}));

vi.mock('../../api/slotsApi', () => ({
  getSlots: vi.fn(),
}));

const enrichedBooking: Booking = {
  id: 1,
  userId: 2,
  vehicleId: 3,
  slotId: 4,
  parkingLotId: 5,
  status: 'CONFIRMED',
  startTime: '2026-06-18T10:00:00.000Z',
  endTime: '2026-06-18T18:00:00.000Z',
  bookingCode: 'BK-001',
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  customerName: 'Test User',
  customerEmail: 'user@example.com',
  vehicleNumber: 'KA01AB1234',
  parkingLotName: 'Main Lot',
  slotNumber: 'A-01',
  floorId: 6,
  floorName: 'Level 1',
};

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(getBookings).mockResolvedValue([enrichedBooking]);
    vi.mocked(getVehicles).mockResolvedValue([]);
    vi.mocked(getParkingLots).mockResolvedValue([]);
    vi.mocked(getSlots).mockResolvedValue([]);
    vi.mocked(getAvailableSlotsForBooking).mockResolvedValue([]);
  });

  it('renders enriched booking labels without calling broad slots APIs on initial load', async () => {
    renderWithProviders(<BookingsPage />);

    expect(screen.getByRole('heading', { name: /bookings/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getBookings).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('BK-001')).toBeInTheDocument();
    expect(screen.getByText('Test User · user@example.com')).toBeInTheDocument();
    expect(screen.getByText('KA01AB1234')).toBeInTheDocument();
    expect(screen.getByText('Main Lot')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('A-01')).toBeInTheDocument();

    expect(getSlots).not.toHaveBeenCalled();
    expect(getAvailableSlotsForBooking).not.toHaveBeenCalled();
  });
});