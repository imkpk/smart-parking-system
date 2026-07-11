import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { createGate, getGateLiveStatus, getGatesByParkingLot } from '@/api/iotGatesApi';
import { getParkingLot } from '@/api/parkingLotsApi';
import { useAuth } from '@/providers/AuthProvider';
import { createMockUser, renderWithProviders } from '@/test/test-utils';
import { Gate } from '@/types/iot';
import { ParkingLot } from '@/types/parkingLot';
import { ParkingLotGatesPage } from '@/pages/parking-lots/ParkingLotGatesPage';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/parkingLotsApi', () => ({
  getParkingLot: vi.fn(),
}));

vi.mock('@/api/iotGatesApi', () => ({
  getGatesByParkingLot: vi.fn(),
  getGateLiveStatus: vi.fn(),
  createGate: vi.fn(),
  updateGate: vi.fn(),
  deleteGate: vi.fn(),
}));

const mockParkingLot: ParkingLot = {
  id: 1,
  name: 'Central Garage',
  type: 'MALL',
  address: '100 Center Rd',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  visibility: 'PRIVATE',
  latitude: null,
  longitude: null,
  baseHourlyRate: null,
  currency: 'INR',
  openingHours: null,
  isActive: true,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

const mockGate: Gate = {
  id: 5,
  parkingLotId: 1,
  externalId: 'gate-entry-1',
  name: 'Main Entry',
  direction: 'ENTRY',
  isActive: true,
  autoOpenEnabled: true,
  anprConfidenceThreshold: 0.85,
  duplicateWindowSeconds: 30,
  commandTtlSeconds: 15,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

function renderGatesPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/parking-lots/:id/gates" element={<ParkingLotGatesPage />} />
    </Routes>,
    { route: '/parking-lots/1/gates' },
  );
}

describe('ParkingLotGatesPage', () => {
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

    vi.mocked(getParkingLot).mockResolvedValue(mockParkingLot);
    vi.mocked(getGatesByParkingLot).mockResolvedValue([mockGate]);
    vi.mocked(getGateLiveStatus).mockResolvedValue({
      gateId: 5,
      gateName: 'Main Entry',
      isActive: true,
      autoOpenEnabled: true,
      devicesOnline: 1,
      devicesTotal: 2,
      devices: [
        {
          id: 10,
          gateId: 5,
          externalDeviceId: 'barrier-1',
          name: 'Barrier Controller',
          deviceType: 'BARRIER_CONTROLLER',
          status: 'ONLINE',
          isEnabled: true,
          lastSeenAt: '2026-06-18T12:00:00.000Z',
          firmwareVersion: '1.0.0',
          createdAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-18T00:00:00.000Z',
        },
      ],
      lastDetectionAt: '2026-06-18T12:00:00.000Z',
      lastAccessAttemptAt: '2026-06-18T12:01:00.000Z',
      pendingCommands: 0,
    });
    vi.mocked(createGate).mockResolvedValue({
      ...mockGate,
      id: 6,
      name: 'Exit Gate',
      externalId: 'gate-exit-1',
    });
  });

  it('renders gates tab with gate list', async () => {
    renderGatesPage();

    expect(await screen.findByRole('heading', { name: /central garage/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /gates/i })).toHaveAttribute('aria-selected', 'true');

    await waitFor(() => {
      expect(getGatesByParkingLot).toHaveBeenCalledWith(1);
    });

    expect(screen.getByText('Main Entry')).toBeInTheDocument();
    expect(screen.getByText('gate-entry-1')).toBeInTheDocument();
  });

  it('opens device health panel for a gate', async () => {
    const user = userEvent.setup();
    renderGatesPage();

    await screen.findByText('Main Entry');

    await user.click(screen.getByRole('button', { name: /view device health for main entry/i }));

    await waitFor(() => {
      expect(getGateLiveStatus).toHaveBeenCalledWith(5);
    });

    expect(screen.getByRole('heading', { name: /device health — main entry/i })).toBeInTheDocument();
    expect(screen.getByText('Barrier Controller')).toBeInTheDocument();
  });

  it('creates a gate from the dialog', async () => {
    const user = userEvent.setup();
    renderGatesPage();

    await screen.findByText('Main Entry');
    await user.click(screen.getByRole('button', { name: /create gate/i }));

    const dialog = await screen.findByRole('dialog', { name: /create gate/i });
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'Exit Gate');
    await user.type(within(dialog).getByRole('textbox', { name: /external id/i }), 'gate-exit-1');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createGate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Exit Gate',
          externalId: 'gate-exit-1',
        }),
      );
    });
  });
});