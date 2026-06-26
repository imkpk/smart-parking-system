import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { getParkingLot } from '@/api/parkingLotsApi';
import { createFloor, deleteFloor, getFloors, updateFloor } from '@/api/floorsApi';
import {
  createBulkSlots,
  createSlot,
  deleteSlot,
  deleteSlots,
  getSlots,
  updateSlotStatus,
} from '@/api/slotsApi';
import { useAuth } from '@/providers/AuthProvider';
import {
  createMockUser,
  getDataGridRowButton,
  getDataGridRowButtons,
  getDataGridRowContaining,
  renderWithProviders,
  selectMuiOption,
} from '@/test/test-utils';
import { Floor } from '@/types/floor';
import { Slot } from '@/types/slot';
import { ParkingLot } from '@/types/parkingLot';
import { ParkingLotDetailsPage } from '@/pages/parking-lots/ParkingLotDetailsPage';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/parkingLotsApi', () => ({
  getParkingLot: vi.fn(),
  getParkingLots: vi.fn(),
  updateParkingLot: vi.fn(),
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

const mockFloor: Floor = {
  id: 10,
  name: 'Level 1',
  level: 1,
  parkingLotId: 1,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

const mockSlot: Slot = {
  id: 100,
  slotNumber: 'A-01',
  slotType: 'CAR',
  status: 'AVAILABLE',
  floorId: 10,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

function renderDetailsPage(route = '/parking-lots/1') {
  return renderWithProviders(
    <Routes>
      <Route path="/parking-lots/:id" element={<ParkingLotDetailsPage />} />
      <Route path="/parking-lots/:id/floors" element={<ParkingLotDetailsPage />} />
      <Route path="/parking-lots/:id/slots" element={<ParkingLotDetailsPage />} />
    </Routes>,
    { route },
  );
}

describe('ParkingLotDetailsPage', () => {
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
    vi.mocked(getFloors).mockResolvedValue([mockFloor]);
    vi.mocked(getSlots).mockResolvedValue([mockSlot]);
    vi.mocked(createFloor).mockResolvedValue({ ...mockFloor, id: 11, name: 'Level 2' });
    vi.mocked(updateFloor).mockResolvedValue(mockFloor);
    vi.mocked(deleteFloor).mockResolvedValue(undefined);
    vi.mocked(createSlot).mockResolvedValue({ ...mockSlot, id: 101, slotNumber: 'B-01' });
    vi.mocked(createBulkSlots).mockResolvedValue([]);
    vi.mocked(updateSlotStatus).mockResolvedValue({ ...mockSlot, status: 'OCCUPIED' });
    vi.mocked(deleteSlot).mockResolvedValue(undefined);
    vi.mocked(deleteSlots).mockResolvedValue(undefined);
  });

  it('renders overview tab with parking lot stats', async () => {
    renderDetailsPage('/parking-lots/1');

    expect(await screen.findByRole('heading', { name: /central garage/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getParkingLot).toHaveBeenCalledWith(1);
      expect(getFloors).toHaveBeenCalledWith(1);
      expect(getSlots).toHaveBeenCalledWith(1);
    });

    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('Floors').length).toBeGreaterThan(0);
    expect(screen.getByText('Total Slots')).toBeInTheDocument();
    expect(screen.getByText('Parking Lot Info')).toBeInTheDocument();
    expect(screen.getAllByText('MALL').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/operational view/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open visual map/i })).toHaveAttribute(
      'href',
      '/parking-lots/1/slot-map',
    );
    expect(screen.getByText('Bengaluru')).toBeInTheDocument();
  });

  it('navigates to floors tab and creates a floor', async () => {
    const user = userEvent.setup({ delay: null });
    renderDetailsPage('/parking-lots/1');
    await screen.findByRole('heading', { name: /central garage/i });

    await user.click(screen.getByRole('tab', { name: /floors/i }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /floors/i })).toHaveAttribute('aria-selected', 'true');
    });

    expect(await screen.findByText('Level 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create floor/i }));

    const dialog = screen.getByRole('dialog', { name: /create floor/i });
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'Level 2');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createFloor).toHaveBeenCalledWith(1, { name: 'Level 2', level: 0 });
    });

    expect(await screen.findByText('Floor created.')).toBeInTheDocument();
  });

  it('edits a floor on floors tab', async () => {
    const user = userEvent.setup({ delay: null });
    renderDetailsPage('/parking-lots/1/floors');
    await screen.findByText('Level 1');

    await user.click(getDataGridRowButton('Level 1', /edit/i));

    const editDialog = screen.getByRole('dialog', { name: /edit floor/i });
    const nameField = within(editDialog).getByRole('textbox', { name: /name/i });
    await user.clear(nameField);
    await user.type(nameField, 'Ground Floor');
    await user.click(within(editDialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateFloor).toHaveBeenCalledWith(10, { name: 'Ground Floor', level: 1 });
    });

    expect(await screen.findByText('Floor updated.')).toBeInTheDocument();
  });

  it('deletes a floor on floors tab', async () => {
    const user = userEvent.setup({ delay: null });
    renderDetailsPage('/parking-lots/1/floors');
    await screen.findByText('Level 1');

    await user.click(getDataGridRowButton('Level 1', /delete/i));

    const confirmDialog = screen.getByRole('dialog', { name: /delete floor/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteFloor).toHaveBeenCalled();
      expect(vi.mocked(deleteFloor).mock.calls[0]?.[0]).toBe(10);
    });

    expect(await screen.findByText('Floor deleted.')).toBeInTheDocument();
  });

  it('applies slot status filter from dashboard donut query param', async () => {
    vi.mocked(getSlots).mockResolvedValue([
      mockSlot,
      { ...mockSlot, id: 101, slotNumber: 'B-02', status: 'OCCUPIED' },
    ]);

    renderDetailsPage('/parking-lots/1/slots?status=AVAILABLE');
    await screen.findByText('A-01');
    expect(screen.queryByText('B-02')).not.toBeInTheDocument();
  });

  it('navigates to slots tab and creates a slot', async () => {
    const user = userEvent.setup({ delay: null });
    renderDetailsPage('/parking-lots/1/slots');
    await screen.findByText('A-01');

    await user.click(screen.getByRole('button', { name: /create slot/i }));

    const dialog = screen.getByRole('dialog', { name: /create slot/i });
    await user.clear(within(dialog).getByLabelText(/prefix/i));
    await user.type(within(dialog).getByLabelText(/prefix/i), 'B-');
    await user.type(within(dialog).getByLabelText(/number/i), '01');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createSlot).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ slotNumber: 'B-01', slotType: 'CAR', status: 'AVAILABLE' }),
      );
    });

    expect(await screen.findByText('Slot created.')).toBeInTheDocument();
  });

  it('bulk creates slots on slots tab', async () => {
    const user = userEvent.setup({ delay: null });
    renderDetailsPage('/parking-lots/1/slots');
    await screen.findByText('A-01');

    await user.click(screen.getByRole('button', { name: /bulk create/i }));

    const dialog = screen.getByRole('dialog', { name: /bulk create slots/i });
    fireEvent.change(within(dialog).getByLabelText(/count/i), { target: { value: '3' } });
    await user.click(within(dialog).getByRole('button', { name: /create slots/i }));

    await waitFor(() => {
      expect(createBulkSlots).toHaveBeenCalledWith(
        10,
        expect.arrayContaining([
          expect.objectContaining({ slotNumber: 'A1', slotType: 'CAR', status: 'AVAILABLE' }),
          expect.objectContaining({ slotNumber: 'A3', slotType: 'CAR', status: 'AVAILABLE' }),
        ]),
      );
    });

    expect(await screen.findByText('3 slots created.')).toBeInTheDocument();
  });

  it('updates slot status and deletes a slot', async () => {
    const user = userEvent.setup({ delay: null });
    renderDetailsPage('/parking-lots/1/slots');
    await screen.findByText('A-01');

    const row = getDataGridRowContaining('A-01');
    const statusSelect = within(row).getByRole('combobox');
    await selectMuiOption(user, statusSelect, /occupied/i);

    await waitFor(() => {
      expect(updateSlotStatus).toHaveBeenCalledWith(100, 'OCCUPIED');
    });

    expect(await screen.findByText('Slot status updated.')).toBeInTheDocument();

    await user.click(getDataGridRowButton('A-01', /delete/i));

    const confirmDialog = screen.getByRole('dialog', { name: /delete slot/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteSlot).toHaveBeenCalled();
      expect(vi.mocked(deleteSlot).mock.calls[0]?.[0]).toBe(100);
    });

    expect(await screen.findByText('Slot deleted.')).toBeInTheDocument();
  });

  it('filters slots and bulk deletes selected slots', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(getSlots).mockResolvedValue([
      mockSlot,
      { ...mockSlot, id: 101, slotNumber: 'B-02', status: 'OCCUPIED' },
    ]);

    renderDetailsPage('/parking-lots/1/slots');
    await screen.findByText('A-01');

    await user.type(
      screen.getByPlaceholderText(/search by slot number, floor, status, or vehicle type/i),
      'B-02',
    );

    expect(screen.queryByText('A-01')).not.toBeInTheDocument();
    expect(screen.getByText('B-02')).toBeInTheDocument();

    const row = getDataGridRowContaining('B-02');
    const rowCheckbox = within(row).getByRole('checkbox');
    await user.click(rowCheckbox);

    await user.click(screen.getByRole('button', { name: /delete selected/i }));

    const bulkDialog = screen.getByRole('dialog', { name: /bulk delete slots/i });
    await user.click(within(bulkDialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteSlots).toHaveBeenCalled();
      expect(vi.mocked(deleteSlots).mock.calls[0]?.[0]).toEqual([101]);
    });

    expect(await screen.findByText('1 slots deleted.')).toBeInTheDocument();
  });
});