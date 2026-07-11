import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGateAccessAttempts,
  getGateDetections,
  getGateLiveStatus,
  getGatesByParkingLot,
  manualOpenGate,
} from '@/api/iotGatesApi';
import { getParkingLots } from '@/api/parkingLotsApi';
import { SecurityGateIotPanel } from '@/components/security/SecurityGateIotPanel';
import { renderWithProviders } from '@/test/test-utils';
import { Gate, GateAccessAttempt, GateDetection } from '@/types/iot';
import { ParkingLot } from '@/types/parkingLot';

vi.mock('@/api/parkingLotsApi', () => ({
  getParkingLots: vi.fn(),
}));

vi.mock('@/api/iotGatesApi', () => ({
  getGatesByParkingLot: vi.fn(),
  getGateLiveStatus: vi.fn(),
  getGateDetections: vi.fn(),
  getGateAccessAttempts: vi.fn(),
  manualOpenGate: vi.fn(),
}));

const mockLot: ParkingLot = {
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

const mockDetection: GateDetection = {
  id: 1,
  gateId: 5,
  deviceId: 10,
  deviceName: 'RFID Reader',
  messageId: 'msg-1',
  identifierType: 'UHF_RFID',
  identifierDisplay: '****AB12',
  confidence: null,
  occurredAt: '2026-06-18T12:00:00.000Z',
  matchedVehicleId: 3,
  matchedVehicleNumber: 'KA01AB1234',
};

const mockGrantedAttempt: GateAccessAttempt = {
  id: 1,
  attemptId: 'attempt-granted',
  gateId: 5,
  source: 'RFID',
  decision: 'GRANTED',
  reasonCode: 'BOOKING_ACTIVE',
  reasonDetail: null,
  vehicleId: 3,
  vehicleNumber: 'KA01AB1234',
  bookingId: 10,
  parkingEventId: null,
  commandId: 'cmd-1',
  createdAt: '2026-06-18T12:01:00.000Z',
};

describe('SecurityGateIotPanel', () => {
  beforeEach(() => {
    vi.mocked(getParkingLots).mockResolvedValue([mockLot]);
    vi.mocked(getGatesByParkingLot).mockResolvedValue([mockGate]);
    vi.mocked(getGateLiveStatus).mockResolvedValue({
      gateId: 5,
      gateName: 'Main Entry',
      isActive: true,
      autoOpenEnabled: true,
      devicesOnline: 1,
      devicesTotal: 1,
      devices: [
        {
          id: 10,
          gateId: 5,
          externalDeviceId: 'rfid-1',
          name: 'RFID Reader',
          deviceType: 'RFID_READER',
          status: 'ONLINE',
          isEnabled: true,
          lastSeenAt: '2026-06-18T12:00:00.000Z',
          firmwareVersion: null,
          createdAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-18T00:00:00.000Z',
        },
      ],
      lastDetectionAt: '2026-06-18T12:00:00.000Z',
      lastAccessAttemptAt: '2026-06-18T12:01:00.000Z',
      pendingCommands: 0,
    });
    vi.mocked(getGateDetections).mockResolvedValue([mockDetection]);
    vi.mocked(getGateAccessAttempts).mockResolvedValue([mockGrantedAttempt]);
    vi.mocked(manualOpenGate).mockResolvedValue({
      attemptId: 'manual-1',
      commandId: 'cmd-manual-1',
      decision: 'GRANTED',
      message: 'Manual gate open requested.',
    });
  });

  it('loads gate monitor data with polling queries', async () => {
    renderWithProviders(<SecurityGateIotPanel />);

    expect(await screen.findByText(/iot gate monitor/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(getGatesByParkingLot).toHaveBeenCalledWith(1);
      expect(getGateLiveStatus).toHaveBeenCalledWith(5);
      expect(getGateDetections).toHaveBeenCalledWith(5, 8);
      expect(getGateAccessAttempts).toHaveBeenCalledWith(5, 8);
    });

    expect(screen.getByText(/latest detections/i)).toBeInTheDocument();
    expect(screen.getByText(/latest access attempts/i)).toBeInTheDocument();
    expect((await screen.findAllByText('KA01AB1234')).length).toBeGreaterThan(0);
  });

  it('submits manual gate open with reason', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SecurityGateIotPanel />);

    await screen.findByRole('button', { name: /manual open/i });
    await waitFor(() => {
      expect(getGatesByParkingLot).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: /manual open/i }));

    const manualDialog = await screen.findByRole('dialog', { name: /manual gate open/i });
    const reasonField = within(manualDialog).getByRole('textbox', { name: /reason/i });
    await user.clear(reasonField);
    await user.type(reasonField, 'Visitor escort at front desk');
    await user.click(within(manualDialog).getByRole('button', { name: /^open gate$/i }));

    await waitFor(
      () => {
        expect(manualOpenGate).toHaveBeenCalledWith(5, {
          reason: 'Visitor escort at front desk',
        });
      },
      { timeout: 10_000 },
    );
  }, 30_000);
});