import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelBooking,
  createBooking,
  getAvailableSlotsForBooking,
  getBookings,
  getMyBookings,
} from '../../api/bookingsApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { getSlots } from '../../api/slotsApi';
import { getMyVehicles, getVehicles } from '../../api/vehiclesApi';
import { useAuth } from '../../providers/AuthProvider';
import {
  createMockUser,
  getDataGridRowButton,
  getDataGridRowButtons,
  renderWithProviders,
  selectMuiOption,
} from '../../test/test-utils';
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
    vi.mocked(getMyBookings).mockResolvedValue([enrichedBooking]);
    vi.mocked(getMyVehicles).mockResolvedValue([
      {
        id: 3,
        userId: 2,
        vehicleNumber: 'KA01AB1234',
        vehicleType: 'CAR',
        brand: null,
        model: null,
        color: null,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    ]);
    vi.mocked(createBooking).mockResolvedValue(enrichedBooking);
    vi.mocked(cancelBooking).mockResolvedValue({ ...enrichedBooking, status: 'CANCELLED' });
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

  it('renders user bookings via getMyBookings', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', id: 2 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BookingsPage />);

    await waitFor(() => {
      expect(getMyBookings).toHaveBeenCalledTimes(1);
    });

    expect(getBookings).not.toHaveBeenCalled();
    expect(await screen.findByText('BK-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create booking/i })).toBeInTheDocument();
  });

  it('creates booking only after form selections and loads available slots then', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', id: 2 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getParkingLots).mockResolvedValue([
      {
        id: 5,
        name: 'Main Lot',
        type: 'MALL',
        address: null,
        city: null,
        state: null,
        pincode: null,
        isActive: true,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    ]);
    vi.mocked(getAvailableSlotsForBooking).mockResolvedValue([
      {
        id: 4,
        slotNumber: 'A-01',
        slotType: 'CAR',
        status: 'AVAILABLE',
        floorId: 6,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    ]);

    renderWithProviders(<BookingsPage />);
    await screen.findByText('BK-001');

    expect(getAvailableSlotsForBooking).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /create booking/i }));

    const dialog = screen.getByRole('dialog', { name: /create booking/i });
    const comboboxes = within(dialog).getAllByRole('combobox');

    await selectMuiOption(user, comboboxes[0], /ka01ab1234/i);
    expect(getAvailableSlotsForBooking).not.toHaveBeenCalled();

    await selectMuiOption(user, comboboxes[2], /main lot/i);

    await waitFor(() => {
      expect(getAvailableSlotsForBooking).toHaveBeenCalledWith(5, 'CAR');
    });

    await selectMuiOption(user, comboboxes[3], /a-01/i);
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalled();
      expect(vi.mocked(createBooking).mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ vehicleId: 3, slotId: 4 }),
      );
    });

    expect(await screen.findByText('Booking created.')).toBeInTheDocument();
  });

  it('shows access denied alert when admin bookings request is forbidden', async () => {
    const error = new AxiosError('Forbidden');
    error.response = { status: 403 } as AxiosError['response'];
    vi.mocked(getBookings).mockRejectedValue(error);

    renderWithProviders(<BookingsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/access denied/i);
    expect(screen.queryByText('BK-001')).not.toBeInTheDocument();
  });

  it('shows generic error alert when admin bookings request fails', async () => {
    vi.mocked(getBookings).mockRejectedValue(new Error('Network down'));

    renderWithProviders(<BookingsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load bookings/i);
  });

  it('renders bookings for SECURITY role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SECURITY' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BookingsPage />);

    await waitFor(() => {
      expect(getBookings).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('BK-001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create booking/i })).not.toBeInTheDocument();
  });

  it('opens booking details dialog for admin', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<BookingsPage />);
    await screen.findByText('BK-001');

    const [detailsButton] = getDataGridRowButtons('BK-001');
    await user.click(detailsButton);

    const dialog = screen.getByRole('dialog', { name: /booking details/i });
    expect(within(dialog).getByText('Main Lot')).toBeInTheDocument();
    expect(within(dialog).getByText('A-01')).toBeInTheDocument();
  });

  it('shows empty search state when no bookings match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingsPage />);
    await screen.findByText('BK-001');

    await user.type(
      screen.getByPlaceholderText(
        /search by booking no, booking code, customer, vehicle number, parking lot, floor, slot, or status/i,
      ),
      'ZZZNOMATCH',
    );

    expect(screen.getByText('No matching bookings')).toBeInTheDocument();
    expect(screen.queryByText('BK-001')).not.toBeInTheDocument();
  });

  it('cancels an active booking for user role', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', id: 2 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<BookingsPage />);
    await screen.findByText('BK-001');

    const cancelButton = getDataGridRowButtons('BK-001').at(-1);
    expect(cancelButton).toBeDefined();
    await user.click(cancelButton!);

    const confirmDialog = screen.getByRole('dialog', { name: /cancel booking/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /cancel booking/i }));

    await waitFor(() => {
      expect(cancelBooking).toHaveBeenCalled();
      expect(vi.mocked(cancelBooking).mock.calls[0]?.[0]).toBe(1);
    });

    expect(await screen.findByText('Booking cancelled.')).toBeInTheDocument();
  });
});