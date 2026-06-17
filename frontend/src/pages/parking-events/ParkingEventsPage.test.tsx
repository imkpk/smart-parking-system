import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveParkingEvents } from '../../api/parkingEventsApi';
import { getSlots } from '../../api/slotsApi';
import { useAuth } from '../../providers/AuthProvider';
import { createMockUser, renderWithProviders } from '../../test/test-utils';
import { ParkingEvent } from '../../types/parkingEvent';
import { ParkingEventsPage } from './ParkingEventsPage';

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../api/parkingEventsApi', () => ({
  getActiveParkingEvents: vi.fn(),
  getParkingEventHistory: vi.fn(),
  getParkingEvents: vi.fn(),
  checkInParkingEvent: vi.fn(),
  checkOutParkingEvent: vi.fn(),
}));

vi.mock('../../api/slotsApi', () => ({
  getSlots: vi.fn(),
}));

const enrichedEvent: ParkingEvent = {
  id: 10,
  bookingId: 1,
  userId: 2,
  vehicleId: 3,
  slotId: 4,
  parkingLotId: 5,
  checkInTime: '2026-06-18T10:00:00.000Z',
  checkOutTime: null,
  status: 'ACTIVE',
  durationMinutes: null,
  feeAmount: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  bookingCode: 'BK-001',
  customerName: 'Test User',
  customerEmail: 'user@example.com',
  vehicleNumber: 'KA01AB1234',
  parkingLotName: 'Main Lot',
  slotNumber: 'A-01',
  floorName: 'Level 1',
};

describe('ParkingEventsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SECURITY' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(getActiveParkingEvents).mockResolvedValue([enrichedEvent]);
    vi.mocked(getSlots).mockResolvedValue([]);
  });

  it('renders enriched parking event labels without calling broad slots APIs on initial load', async () => {
    renderWithProviders(<ParkingEventsPage />);

    expect(screen.getByRole('heading', { name: /parking events/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getActiveParkingEvents).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('BK-001')).toBeInTheDocument();
    expect(screen.getByText('Test User · user@example.com')).toBeInTheDocument();
    expect(screen.getByText('KA01AB1234')).toBeInTheDocument();
    expect(screen.getByText('Main Lot')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('A-01')).toBeInTheDocument();

    expect(getSlots).not.toHaveBeenCalled();
  });
});