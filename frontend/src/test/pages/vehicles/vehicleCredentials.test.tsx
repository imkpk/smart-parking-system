import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignRfidCredential,
  generateQrCredential,
  getVehicleCredentials,
  revokeVehicleCredential,
} from '@/api/vehicleCredentialsApi';
import { VehicleCredentialsPanel } from '@/components/vehicles/VehicleCredentialsPanel';
import { renderWithProviders } from '@/test/test-utils';
import { VehicleCredential } from '@/types/iot';

vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined),
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  },
}));

vi.mock('@/api/vehicleCredentialsApi', () => ({
  getVehicleCredentials: vi.fn(),
  assignRfidCredential: vi.fn(),
  generateQrCredential: vi.fn(),
  revokeVehicleCredential: vi.fn(),
}));

const activeRfid: VehicleCredential = {
  id: 1,
  vehicleId: 7,
  credentialType: 'UHF_RFID',
  displaySuffix: 'AB12',
  status: 'ACTIVE',
  validFrom: '2026-06-18T00:00:00.000Z',
  validUntil: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('VehicleCredentialsPanel', () => {
  beforeEach(() => {
    vi.mocked(getVehicleCredentials).mockResolvedValue([activeRfid]);
    vi.mocked(assignRfidCredential).mockResolvedValue({
      credential: { ...activeRfid, id: 2, displaySuffix: 'CD34' },
    });
    vi.mocked(generateQrCredential).mockResolvedValue({
      credential: {
        ...activeRfid,
        id: 3,
        credentialType: 'QR_CODE',
        displaySuffix: 'QR01',
      },
      qrPayload: 'qr-token-one-time-abc123',
    });
    vi.mocked(revokeVehicleCredential).mockResolvedValue({
      ...activeRfid,
      status: 'REVOKED',
    });
  });

  it('renders active credentials', async () => {
    renderWithProviders(<VehicleCredentialsPanel vehicleId={7} />);

    await waitFor(() => {
      expect(getVehicleCredentials).toHaveBeenCalledWith(7);
    });

    expect(await screen.findByText(/AB12/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign rfid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate qr/i })).toBeInTheDocument();
  });

  it('assigns an RFID credential', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VehicleCredentialsPanel vehicleId={7} />);

    await screen.findByText(/ab12/i);
    await user.click(screen.getByRole('button', { name: /assign rfid/i }));

    fireEvent.change(screen.getByLabelText(/rfid tag/i), { target: { value: 'E280116060000203' } });
    await user.click(screen.getByRole('button', { name: /^assign$/i }));

    await waitFor(() => {
      expect(assignRfidCredential).toHaveBeenCalledWith(7, { rfidTag: 'E280116060000203' });
    });
  });

  it('shows one-time QR payload dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(getVehicleCredentials).mockResolvedValue([]);

    renderWithProviders(<VehicleCredentialsPanel vehicleId={7} />);

    await screen.findByRole('button', { name: /generate qr/i });
    await user.click(screen.getByRole('button', { name: /generate qr/i }));

    await waitFor(() => {
      expect(generateQrCredential).toHaveBeenCalledWith(7);
    });

    expect(screen.getByText(/one-time display/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle access qr code/i)).toBeInTheDocument();
  });

  it('revokes an active credential', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VehicleCredentialsPanel vehicleId={7} />);

    await screen.findByText(/ab12/i);
    await user.click(await screen.findByRole('button', { name: /^revoke$/i }));
    const dialog = await screen.findByRole('dialog', { name: /revoke credential/i });
    await user.click(within(dialog).getByRole('button', { name: /^revoke$/i }));

    await waitFor(() => {
      expect(revokeVehicleCredential).toHaveBeenCalledWith(7, 1);
    });
  });
});