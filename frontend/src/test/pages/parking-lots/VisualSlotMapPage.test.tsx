import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getParkingLot, getParkingLots } from '@/api/parkingLotsApi';
import { getSlotMap } from '@/api/slotMapApi';
import { useAuth } from '@/providers/AuthProvider';
import { VisualSlotMapPage } from '@/pages/parking-lots/VisualSlotMapPage';
import { createMockUser, renderWithProviders } from '@/test/test-utils';
import { SlotMapResponse } from '@/types/slotMap';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/slotMapApi', () => ({
  getSlotMap: vi.fn(),
}));

vi.mock('@/api/parkingLotsApi', () => ({
  getParkingLot: vi.fn(),
  getParkingLots: vi.fn(),
}));

const slotMapFixture: SlotMapResponse = {
  parkingLot: { id: 1, name: 'Main Lot', isActive: true },
  floors: [{ id: 10, name: 'Ground', level: 0, slotCount: 3 }],
  selectedFloorId: null,
  groups: [
    {
      floorId: 10,
      floorName: 'Ground',
      level: 0,
      slots: [
        {
          id: 101,
          slotNumber: 'A-01',
          slotType: 'CAR',
          status: 'AVAILABLE',
          displayLabel: 'A-01',
          floorId: 10,
          floorName: 'Ground',
          floorLevel: 0,
          isMaintenance: false,
        },
        {
          id: 102,
          slotNumber: 'A-02',
          slotType: 'EV',
          status: 'OCCUPIED',
          displayLabel: 'A-02',
          floorId: 10,
          floorName: 'Ground',
          floorLevel: 0,
          isMaintenance: false,
          occupancy: {
            state: 'OCCUPIED',
            vehicleNumber: 'TS09EA1234',
            bookingCode: 'BK-100',
            bookingId: 12,
            eventId: 55,
            checkedInAt: '2026-06-19T08:00:00.000Z',
          },
        },
      ],
    },
  ],
  legend: {
    AVAILABLE: 1,
    RESERVED: 0,
    OCCUPIED: 1,
    MAINTENANCE: 0,
    UNKNOWN: 0,
  },
  filters: { floorId: null, status: null, vehicleType: null },
  lastUpdated: '2026-06-19T12:00:00.000Z',
};

function renderSlotMapPage(route = '/parking-lots/1/slot-map') {
  return renderWithProviders(
    <Routes>
      <Route path="/parking-lots/:id/slot-map" element={<VisualSlotMapPage />} />
    </Routes>,
    { route },
  );
}

const parkingLotFixture = {
  id: 1,
  name: 'Main Lot',
  type: 'MALL' as const,
  address: '123 Main St',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  isActive: true,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('VisualSlotMapPage', () => {
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
    vi.mocked(getSlotMap).mockResolvedValue(slotMapFixture);
    vi.mocked(getParkingLot).mockResolvedValue(parkingLotFixture);
    vi.mocked(getParkingLots).mockResolvedValue([parkingLotFixture]);
  });

  it('renders workspace header, slot map, legend, and status labels', async () => {
    renderSlotMapPage();

    expect(await screen.findByRole('heading', { name: /main lot/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /visual map/i })).toHaveAttribute('aria-selected', 'true');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ground/i })).toBeInTheDocument();
      expect(screen.getByText('Legend')).toBeInTheDocument();
      expect(screen.getAllByText('Available').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Occupied').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByRole('button', { name: /a-01, available, car/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /a-02, occupied, ev/i })).toBeInTheDocument();
  });

  it('opens the slot detail drawer when a slot card is clicked', async () => {
    const user = userEvent.setup();
    renderSlotMapPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /a-02, occupied, ev/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /a-02, occupied, ev/i }));

    expect(screen.getByRole('heading', { name: /slot a-02/i })).toBeInTheDocument();
    expect(screen.getByText(/vehicle: ts09ea1234/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view parking events/i })).toHaveAttribute(
      'href',
      '/parking-events',
    );
  });

  it('applies floor filter through the API query', async () => {
    const user = userEvent.setup();
    renderSlotMapPage();

    await waitFor(() => {
      expect(getSlotMap).toHaveBeenCalledWith(1, {});
      expect(screen.getByRole('combobox', { name: /^floor$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('combobox', { name: /^floor$/i }));
    await user.click(screen.getByRole('option', { name: 'Ground' }));

    await waitFor(() => {
      expect(getSlotMap).toHaveBeenCalledWith(1, { floorId: 10 });
    });
  });

  it('shows empty state when no slots match search', async () => {
    const user = userEvent.setup();
    renderSlotMapPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /a-01, available, car/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/search slots/i), 'ZZZ-404');

    expect(screen.getByText(/no slots match the current filters/i)).toBeInTheDocument();
  });

  it('shows error state when slot map request fails', async () => {
    vi.mocked(getSlotMap).mockRejectedValue(new Error('Network error'));

    renderSlotMapPage();

    expect(
      await screen.findByText(/could not load the visual slot map/i),
    ).toBeInTheDocument();
  });
});