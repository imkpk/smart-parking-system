import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { getParkingLot, getParkingLots } from '@/api/parkingLotsApi';
import { getFloors } from '@/api/floorsApi';
import { getSlots } from '@/api/slotsApi';
import { ParkingLotDetailsPage } from '@/pages/parking-lots/ParkingLotDetailsPage';
import { ParkingLotsPage } from '@/pages/parking-lots/ParkingLotsPage';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { useAuth } from '@/providers/AuthProvider';
import { createMockUser, renderWithProviders } from '@/test/test-utils';
import { ParkingLot } from '@/types/parkingLot';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/parkingLotsApi', () => ({
  getParkingLots: vi.fn(),
  getParkingLot: vi.fn(),
  createParkingLot: vi.fn(),
  updateParkingLot: vi.fn(),
  deleteParkingLot: vi.fn(),
}));

vi.mock('@/api/floorsApi', () => ({
  getFloors: vi.fn(),
  createFloor: vi.fn(),
  updateFloor: vi.fn(),
  deleteFloor: vi.fn(),
}));

vi.mock('@/api/slotsApi', () => ({
  getSlots: vi.fn(),
  createSlot: vi.fn(),
  createBulkSlots: vi.fn(),
  updateSlotStatus: vi.fn(),
  deleteSlot: vi.fn(),
  deleteSlots: vi.fn(),
}));

const mockParkingLot: ParkingLot = {
  id: 1,
  name: 'Central Garage',
  type: 'MALL',
  address: '100 Center Rd',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  isActive: true,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('Phase 4E parking lot management UX', () => {
  beforeEach(() => {
    vi.mocked(getParkingLot).mockResolvedValue(mockParkingLot);
    vi.mocked(getFloors).mockResolvedValue([]);
    vi.mocked(getSlots).mockResolvedValue([]);
  });

  it('shows workspace header and visual map CTA for admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(
      <Routes>
        <Route path="/parking-lots/:id" element={<ParkingLotDetailsPage />} />
      </Routes>,
      { route: '/parking-lots/1' },
    );

    expect(await screen.findByRole('heading', { name: /central garage/i })).toBeInTheDocument();
    expect(screen.getByText(/100 center rd · bengaluru, karnataka · 560001/i)).toBeInTheDocument();
    const visualMapLinks = screen.getAllByRole('link', { name: /open visual map/i });
    expect(visualMapLinks.length).toBeGreaterThanOrEqual(1);
    expect(visualMapLinks[0]).toHaveAttribute('href', '/parking-lots/1/slot-map');
    expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
  });

  it('hides destructive parking lot list actions for security', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SECURITY' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(getParkingLots).mockResolvedValue([mockParkingLot]);

    renderWithProviders(<ParkingLotsPage />);
    await screen.findByText('Central Garage');

    expect(screen.getByRole('link', { name: /manage central garage/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create parking lot/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/edit central garage/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete central garage/i)).not.toBeInTheDocument();
  });

  it('blocks user access to parking lot management list route', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(
      <Routes>
        <Route element={<RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'SECURITY']} />}>
          <Route path="/parking-lots" element={<ParkingLotsPage />} />
        </Route>
      </Routes>,
      { route: '/parking-lots' },
    );

    await waitFor(() => {
      expect(screen.getByText(/you do not have access to this page/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: /parking lots/i })).not.toBeInTheDocument();
  });
});