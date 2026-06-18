import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createVehicle,
  deleteVehicle,
  getMyVehicles,
  getVehicles,
  updateVehicle,
} from '@/api/vehiclesApi';
import { getUsers } from '@/api/usersApi';
import { useAuth } from '@/providers/AuthProvider';
import {
  createMockUser,
  getDataGridRowButtons,
  renderWithProviders,
  selectMuiOption,
} from '@/test/test-utils';
import { Vehicle } from '@/types/vehicle';
import { VehiclesPage } from '@/pages/vehicles/VehiclesPage';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/vehiclesApi', () => ({
  getVehicles: vi.fn(),
  getMyVehicles: vi.fn().mockResolvedValue([]),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
}));

vi.mock('@/api/usersApi', () => ({
  getUsers: vi.fn(),
}));

const mockVehicle: Vehicle = {
  id: 1,
  userId: 2,
  vehicleNumber: 'KA01AB1234',
  vehicleType: 'CAR',
  brand: 'Toyota',
  model: 'Camry',
  color: 'White',
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('VehiclesPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN', id: 99 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(getVehicles).mockResolvedValue([mockVehicle]);
    vi.mocked(getUsers).mockResolvedValue([
      createMockUser({ id: 2, name: 'Owner User', email: 'owner@example.com' }),
    ]);
    vi.mocked(createVehicle).mockResolvedValue({ ...mockVehicle, id: 2 });
    vi.mocked(updateVehicle).mockResolvedValue(mockVehicle);
    vi.mocked(deleteVehicle).mockResolvedValue(undefined);
  });

  it('renders admin grid with enriched owner data', async () => {
    renderWithProviders(<VehiclesPage />);

    expect(screen.getByRole('heading', { name: /vehicles/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getVehicles).toHaveBeenCalled();
      expect(getUsers).toHaveBeenCalled();
    });

    expect(await screen.findByText('KA01AB1234')).toBeInTheDocument();
    expect(screen.getByText('Toyota')).toBeInTheDocument();
    expect(screen.getByText('Camry')).toBeInTheDocument();
    expect(screen.getByText('White')).toBeInTheDocument();
    expect(screen.getByText('Owner User · owner@example.com')).toBeInTheDocument();
  });

  it('filters vehicles via search', async () => {
    const user = userEvent.setup();
    vi.mocked(getVehicles).mockResolvedValue([
      mockVehicle,
      { ...mockVehicle, id: 2, vehicleNumber: 'MH12XY9999', brand: 'Honda' },
    ]);

    renderWithProviders(<VehiclesPage />);
    await screen.findByText('KA01AB1234');

    const searchInput = screen.getByPlaceholderText(
      /search by vehicle number, type, brand, model, color, or owner/i,
    );
    await user.type(searchInput, 'MH12');

    expect(screen.queryByText('KA01AB1234')).not.toBeInTheDocument();
    expect(screen.getByText('MH12XY9999')).toBeInTheDocument();
  });

  it('opens create dialog and submits new vehicle', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<VehiclesPage />);
    await screen.findByText('KA01AB1234');

    await user.click(screen.getByRole('button', { name: /add vehicle/i }));

    expect(screen.getByRole('heading', { name: /add vehicle/i })).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/vehicle number/i), 'DL01ZZ1111');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createVehicle).toHaveBeenCalled();
      expect(vi.mocked(createVehicle).mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ vehicleNumber: 'DL01ZZ1111', vehicleType: 'CAR' }),
      );
    });

    expect(await screen.findByText('Vehicle created.')).toBeInTheDocument();
  });

  it('opens edit dialog and submits updated vehicle', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<VehiclesPage />);
    await screen.findByText('KA01AB1234');

    const [, editButton] = getDataGridRowButtons('KA01AB1234');
    await user.click(editButton);

    expect(screen.getByRole('heading', { name: /edit vehicle/i })).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const numberField = within(dialog).getByLabelText(/vehicle number/i);
    await user.clear(numberField);
    await user.type(numberField, 'KA01AB5678');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateVehicle).toHaveBeenCalled();
      expect(vi.mocked(updateVehicle).mock.calls[0]?.[0]).toBe(1);
      expect(vi.mocked(updateVehicle).mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({ vehicleNumber: 'KA01AB5678' }),
      );
    });

    expect(await screen.findByText('Vehicle updated.')).toBeInTheDocument();
  });

  it('renders user vehicles via getMyVehicles', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', id: 2 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getMyVehicles).mockResolvedValue([mockVehicle]);

    renderWithProviders(<VehiclesPage />);

    await waitFor(() => {
      expect(getMyVehicles).toHaveBeenCalled();
    });

    expect(getVehicles).not.toHaveBeenCalled();
    expect(await screen.findByText('KA01AB1234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add vehicle/i })).toBeInTheDocument();
  });

  it('opens vehicle details dialog', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<VehiclesPage />);
    await screen.findByText('KA01AB1234');

    const [detailsButton] = getDataGridRowButtons('KA01AB1234');
    await user.click(detailsButton);

    const dialog = screen.getByRole('dialog', { name: /vehicle details/i });
    expect(within(dialog).getByText('Toyota')).toBeInTheDocument();
    expect(within(dialog).getByText('Owner')).toBeInTheDocument();
  });

  it('creates vehicle with optional brand, model, and color fields', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<VehiclesPage />);
    await screen.findByText('KA01AB1234');

    await user.click(screen.getByRole('button', { name: /add vehicle/i }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText(/vehicle number/i), 'DL01ZZ1111');
    await user.type(within(dialog).getByLabelText(/brand/i), 'Honda');
    await user.type(within(dialog).getByLabelText(/model/i), 'City');
    await user.type(within(dialog).getByLabelText(/color/i), 'Blue');
    await selectMuiOption(user, within(dialog).getByRole('combobox'), /bike/i);
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createVehicle).toHaveBeenCalled();
      expect(vi.mocked(createVehicle).mock.calls[0]?.[0]).toEqual({
        vehicleNumber: 'DL01ZZ1111',
        vehicleType: 'BIKE',
        brand: 'Honda',
        model: 'City',
        color: 'Blue',
      });
    });
  });

  it('shows empty search state when no vehicles match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VehiclesPage />);
    await screen.findByText('KA01AB1234');

    await user.type(
      screen.getByPlaceholderText(/search by vehicle number, type, brand, model, color, or owner/i),
      'ZZZNOMATCH',
    );

    expect(screen.getByText('No matching vehicles')).toBeInTheDocument();
    expect(screen.queryByText('KA01AB1234')).not.toBeInTheDocument();
  });

  it('confirms and deletes a vehicle', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<VehiclesPage />);
    await screen.findByText('KA01AB1234');

    const [, , deleteButton] = getDataGridRowButtons('KA01AB1234');
    await user.click(deleteButton);

    expect(screen.getByText(/delete vehicle ka01ab1234/i)).toBeInTheDocument();

    const confirmDialog = screen.getByRole('dialog', { name: /delete vehicle/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteVehicle).toHaveBeenCalled();
      expect(vi.mocked(deleteVehicle).mock.calls[0]?.[0]).toBe(1);
    });

    expect(await screen.findByText('Vehicle deleted.')).toBeInTheDocument();
  });
});