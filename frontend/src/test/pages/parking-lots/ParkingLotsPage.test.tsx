import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createParkingLot,
  deleteParkingLot,
  getParkingLots,
  updateParkingLot,
} from '@/api/parkingLotsApi';
import { useAuth } from '@/providers/AuthProvider';
import {
  createMockUser,
  getDataGridRowButtons,
  renderWithProviders,
} from '@/test/test-utils';
import { ParkingLot } from '@/types/parkingLot';
import { ParkingLotsPage } from '@/pages/parking-lots/ParkingLotsPage';

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

const mockParkingLot: ParkingLot = {
  id: 1,
  name: 'Main Lot',
  type: 'MALL',
  address: '123 Main St',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  isActive: true,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('ParkingLotsPage', () => {
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

    vi.mocked(getParkingLots).mockResolvedValue([mockParkingLot]);
    vi.mocked(createParkingLot).mockResolvedValue({ ...mockParkingLot, id: 2, name: 'New Lot' });
    vi.mocked(updateParkingLot).mockResolvedValue(mockParkingLot);
    vi.mocked(deleteParkingLot).mockResolvedValue(undefined);
  });

  it('renders parking lots list', async () => {
    renderWithProviders(<ParkingLotsPage />);

    expect(screen.getByRole('heading', { name: /parking lots/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getParkingLots).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Main Lot')).toBeInTheDocument();
    expect(screen.getByText('MALL')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('filters parking lots via search', async () => {
    const user = userEvent.setup();
    vi.mocked(getParkingLots).mockResolvedValue([
      mockParkingLot,
      { ...mockParkingLot, id: 2, name: 'Airport Lot', city: 'Mumbai' },
    ]);

    renderWithProviders(<ParkingLotsPage />);
    await screen.findByText('Main Lot');

    await user.type(
      screen.getByPlaceholderText(/search by name, type, city, state, or pincode/i),
      'Airport',
    );

    expect(screen.queryByText('Main Lot')).not.toBeInTheDocument();
    expect(screen.getByText('Airport Lot')).toBeInTheDocument();
  });

  it('creates a parking lot via dialog', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ParkingLotsPage />);
    await screen.findByText('Main Lot');

    await user.click(screen.getByRole('button', { name: /create parking lot/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'New Lot');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createParkingLot).toHaveBeenCalled();
      expect(vi.mocked(createParkingLot).mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ name: 'New Lot', type: 'APARTMENT', isActive: true }),
      );
    });

    expect(await screen.findByText('Parking lot created.')).toBeInTheDocument();
  });

  it('edits a parking lot via dialog', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ParkingLotsPage />);
    await screen.findByText('Main Lot');

    const [, editButton] = getDataGridRowButtons('Main Lot');
    await user.click(editButton);

    const dialog = screen.getByRole('dialog', { name: /edit parking lot/i });
    const nameField = within(dialog).getByRole('textbox', { name: /name/i });
    await user.clear(nameField);
    await user.type(nameField, 'Updated Lot');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateParkingLot).toHaveBeenCalled();
      expect(vi.mocked(updateParkingLot).mock.calls[0]?.[0]).toBe(1);
      expect(vi.mocked(updateParkingLot).mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({ name: 'Updated Lot' }),
      );
    });

    expect(await screen.findByText('Parking lot updated.')).toBeInTheDocument();
  });

  it('deletes a parking lot after confirmation', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ParkingLotsPage />);
    await screen.findByText('Main Lot');

    const rowButtons = getDataGridRowButtons('Main Lot');
    const deleteButton = rowButtons[rowButtons.length - 1];
    await user.click(deleteButton);

    expect(screen.getByText(/delete main lot/i)).toBeInTheDocument();

    const confirmDialog = screen.getByRole('dialog', { name: /delete parking lot/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteParkingLot).toHaveBeenCalled();
      expect(vi.mocked(deleteParkingLot).mock.calls[0]?.[0]).toBe(1);
    });

    expect(await screen.findByText('Parking lot deleted.')).toBeInTheDocument();
  });
});