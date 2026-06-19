import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkInParkingEvent,
  checkOutParkingEvent,
  getActiveParkingEvents,
  getParkingEventHistory,
  getParkingEvents,
} from '@/api/parkingEventsApi';
import { getSlots } from '@/api/slotsApi';
import { useAuth } from '@/providers/AuthProvider';
import { createMockUser, getDataGridRowButtons, renderWithProviders } from '@/test/test-utils';
import { ParkingEvent } from '@/types/parkingEvent';
import { ParkingEventsPage } from '@/pages/parking-events/ParkingEventsPage';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/parkingEventsApi', () => ({
  getActiveParkingEvents: vi.fn(),
  getParkingEventHistory: vi.fn(),
  getParkingEvents: vi.fn(),
  checkInParkingEvent: vi.fn(),
  checkOutParkingEvent: vi.fn(),
}));

vi.mock('@/api/slotsApi', () => ({
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
    vi.mocked(getParkingEvents).mockResolvedValue([
      { ...enrichedEvent, id: 11, status: 'COMPLETED', checkOutTime: '2026-06-18T18:00:00.000Z' },
    ]);
    vi.mocked(getParkingEventHistory).mockResolvedValue([]);
    vi.mocked(checkInParkingEvent).mockResolvedValue(enrichedEvent);
    vi.mocked(checkOutParkingEvent).mockResolvedValue({
      parkingEvent: {
        ...enrichedEvent,
        status: 'COMPLETED',
        checkOutTime: '2026-06-18T18:00:00.000Z',
        durationMinutes: 480,
        feeAmount: 200,
      },
      paymentInitiated: true,
      payment: { status: 'INITIATED', amount: 200 },
    });
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

  it('submits check-in form with booking code', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ParkingEventsPage />);
    await screen.findByText('BK-001');

    await user.type(screen.getByLabelText(/booking code/i), 'BK-001');
    await user.click(screen.getByRole('button', { name: /check in/i }));

    await waitFor(() => {
      expect(checkInParkingEvent).toHaveBeenCalled();
      expect(vi.mocked(checkInParkingEvent).mock.calls[0]?.[0]).toEqual({
        bookingCode: 'BK-001',
      });
    });

    expect(await screen.findByText(/checked in booking/i)).toBeInTheDocument();
  });

  it('checks out an active parking event', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ParkingEventsPage />);
    await screen.findByText('BK-001');

    await user.click(screen.getByRole('button', { name: /check out/i }));

    const confirmDialog = screen.getByRole('dialog', { name: /confirm check-out/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /check out/i }));

    await waitFor(() => {
      expect(checkOutParkingEvent).toHaveBeenCalled();
      expect(vi.mocked(checkOutParkingEvent).mock.calls[0]?.[0]).toEqual({
        parkingEventId: 10,
      });
    });

    expect(await screen.findByText('Parking event checked out.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /check-out result/i })).toBeInTheDocument();
  });

  it('shows only active events for security without history tab', async () => {
    renderWithProviders(<ParkingEventsPage />);

    await waitFor(() => {
      expect(getActiveParkingEvents).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('tab', { name: /active events/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /event history/i })).not.toBeInTheDocument();
    expect(getParkingEvents).not.toHaveBeenCalled();
    expect(await screen.findByText('BK-001')).toBeInTheDocument();
  });

  it('shows active events error alert when load fails', async () => {
    vi.mocked(getActiveParkingEvents).mockRejectedValue(new Error('Active events failed'));

    renderWithProviders(<ParkingEventsPage />);

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/could not load active parking events/i);
  });

  it('renders user parking history', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', id: 2 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getParkingEventHistory).mockResolvedValue([
      {
        ...enrichedEvent,
        id: 12,
        status: 'COMPLETED',
        checkOutTime: '2026-06-18T18:00:00.000Z',
      },
    ]);

    renderWithProviders(<ParkingEventsPage />);

    await waitFor(() => {
      expect(getParkingEventHistory).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: /parking history/i })).toBeInTheDocument();
    expect(screen.queryByText('My Parking History')).not.toBeInTheDocument();
    expect(await screen.findByText('BK-001')).toBeInTheDocument();
    expect(getActiveParkingEvents).not.toHaveBeenCalled();
  });

  it('opens parking event details dialog', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ParkingEventsPage />);
    await screen.findByText('BK-001');

    const [detailsButton] = getDataGridRowButtons('BK-001');
    await user.click(detailsButton);

    const dialog = screen.getByRole('dialog', { name: /parking session details/i });
    expect(within(dialog).getByText('Main Lot')).toBeInTheDocument();
    expect(within(dialog).getByText('A-01')).toBeInTheDocument();
  });

  it('shows history error alert for admin on history tab', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getParkingEvents).mockRejectedValue(new Error('History failed'));

    renderWithProviders(<ParkingEventsPage />);
    await screen.findByText('BK-001');

    await user.click(screen.getByRole('tab', { name: /event history/i }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/could not load parking event history/i);
  });

  it('shows event history tab for admin', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<ParkingEventsPage />);
    await screen.findByText('BK-001');

    await user.click(screen.getByRole('tab', { name: /event history/i }));

    await waitFor(() => {
      expect(getParkingEvents).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('tab', { name: /event history/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText('SES-000011')).toBeInTheDocument();
  });
});