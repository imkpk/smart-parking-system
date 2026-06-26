import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookings } from '@/api/bookingsApi';
import { getParkingLots } from '@/api/parkingLotsApi';
import { getSlots } from '@/api/slotsApi';
import { getUsers } from '@/api/usersApi';
import { getVehicles } from '@/api/vehiclesApi';
import { createTestQueryClient } from '@/test/test-utils';
import { Booking } from '@/types/booking';
import { ParkingLot } from '@/types/parkingLot';
import { Slot } from '@/types/slot';
import { Vehicle } from '@/types/vehicle';
import { useReferenceLabels } from '@/hooks/useReferenceLabels';

vi.mock('@/api/bookingsApi', () => ({
  getBookings: vi.fn(),
  getMyBookings: vi.fn(),
}));

vi.mock('@/api/vehiclesApi', () => ({
  getVehicles: vi.fn(),
  getMyVehicles: vi.fn(),
}));

vi.mock('@/api/usersApi', () => ({
  getUsers: vi.fn(),
}));

vi.mock('@/api/parkingLotsApi', () => ({
  getParkingLots: vi.fn(),
}));

vi.mock('@/api/slotsApi', () => ({
  getSlots: vi.fn(),
}));

const booking: Booking = {
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
};

const vehicle: Vehicle = {
  id: 3,
  userId: 2,
  vehicleNumber: 'KA01AB1234',
  vehicleType: 'CAR',
  brand: null,
  model: null,
  color: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

const parkingLot: ParkingLot = {
  id: 5,
  name: 'Main Lot',
  type: 'PUBLIC',
  address: '123 Main St',
  city: null,
  state: null,
  pincode: null,
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

const slot: Slot = {
  id: 4,
  floorId: 1,
  slotNumber: 'A-01',
  slotType: 'CAR',
  status: 'AVAILABLE',
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

function createWrapper(queryClient = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useReferenceLabels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBookings).mockResolvedValue([booking]);
    vi.mocked(getVehicles).mockResolvedValue([vehicle]);
    vi.mocked(getUsers).mockResolvedValue([
      {
        id: 2,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        role: 'USER',
        isActive: true,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    ]);
    vi.mocked(getParkingLots).mockResolvedValue([parkingLot]);
    vi.mocked(getSlots).mockResolvedValue([slot]);
  });

  it('uses shared query keys without context suffixes', async () => {
    const queryClient = createTestQueryClient();

    renderHook(
      () =>
        useReferenceLabels({
          includeUsers: true,
          role: 'ADMIN',
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(getBookings).toHaveBeenCalled();
    });

    const queryKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((entry) => entry.queryKey);

    expect(queryKeys).toContainEqual(['bookings', 'all']);
    expect(queryKeys).toContainEqual(['vehicles', 'all']);
    expect(queryKeys).toContainEqual(['users']);
    expect(queryKeys.some((key) => key.includes('payment-enrichment'))).toBe(false);
    expect(queryKeys.some((key) => key.includes('vehicles-page'))).toBe(false);
  });

  it('reuses cached bookings and vehicles when shared keys are already populated', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['bookings', 'all'], [booking]);
    queryClient.setQueryData(['vehicles', 'all'], [vehicle]);

    renderHook(
      () =>
        useReferenceLabels({
          role: 'ADMIN',
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(
        queryClient.getQueryCache().find({ queryKey: ['bookings', 'all'] })?.state.data,
      ).toEqual([booking]);
    });

    expect(getBookings).not.toHaveBeenCalled();
    expect(getVehicles).not.toHaveBeenCalled();
  });

  it('does not fetch parking structure unless includeParkingStructure is true', async () => {
    renderHook(
      () =>
        useReferenceLabels({
          includeUsers: true,
          role: 'ADMIN',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(getBookings).toHaveBeenCalled();
    });

    expect(getParkingLots).not.toHaveBeenCalled();
    expect(getSlots).not.toHaveBeenCalled();
  });

  it('resolves admin labels with parking structure data when explicitly enabled', async () => {
    const { result } = renderHook(
      () =>
        useReferenceLabels({
          includeParkingStructure: true,
          includeUsers: true,
          role: 'ADMIN',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.getBookingLabel(1)).toBe('BK-001');
    });

    expect(getParkingLots).toHaveBeenCalled();
    expect(getSlots).toHaveBeenCalledWith(5);
    expect(result.current.getBookingCode(1)).toBe('BK-001');
    expect(result.current.getVehicleLabel(3)).toBe('KA01AB1234');
    expect(result.current.getVehicleLabelForBooking(1)).toBe('KA01AB1234');
    expect(result.current.getParkingLotLabel(5)).toBe('Main Lot');
    expect(result.current.getSlotLabel(4)).toBe('A-01');
    expect(result.current.getCustomerLabel(2)).toBe('Jane Doe · jane@example.com');
    expect(result.current.getSessionLabel(7)).toBe('SES-000007');
  });

  it('falls back to formatted labels when reference data is missing', async () => {
    const { result } = renderHook(
      () =>
        useReferenceLabels({
          includeParkingStructure: true,
          role: 'ADMIN',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.getBookingLabel(1)).toBe('BK-001');
    });

    expect(result.current.getBookingLabel(99)).toBe('BK-000099');
    expect(result.current.getVehicleLabel(99)).toBe('Vehicle #99');
    expect(result.current.getVehicleLabelForBooking(99)).toBe('-');
    expect(result.current.getParkingLotLabel(99)).toBe('Lot #99');
    expect(result.current.getSlotLabel(99)).toBe('Slot #99');
    expect(result.current.getCustomerLabel(99)).toBe('Customer #99');
  });
});