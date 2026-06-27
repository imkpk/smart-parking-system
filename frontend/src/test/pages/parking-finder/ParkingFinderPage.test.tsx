import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublicParkingFinderResults } from '@/api/publicParkingFinderApi';
import { ParkingFinderPage } from '@/pages/parking-finder/ParkingFinderPage';
import { useAuth } from '@/providers/AuthProvider';
import { spyConsoleErrors } from '@/test/consoleAssertions';
import { createMockUser, renderWithProviders } from '@/test/test-utils';

vi.mock('@/api/publicParkingFinderApi', () => ({
  getPublicParkingFinderResults: vi.fn(),
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('ParkingFinderPage', () => {
  let consoleErrors = spyConsoleErrors();

  beforeEach(() => {
    consoleErrors.restore();
    consoleErrors = spyConsoleErrors();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getPublicParkingFinderResults).mockResolvedValue([]);
  });

  afterEach(() => {
    consoleErrors.restore();
  });

  it('renders public finder without auth', async () => {
    renderWithProviders(<ParkingFinderPage />);

    expect(screen.getByRole('heading', { name: /find parking/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle type/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(getPublicParkingFinderResults).toHaveBeenCalledTimes(1);
    });

    consoleErrors.expectNone();
  });

  it('renders loading state', () => {
    vi.mocked(getPublicParkingFinderResults).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderWithProviders(<ParkingFinderPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders empty state when no results', async () => {
    renderWithProviders(<ParkingFinderPage />);

    expect(await screen.findByText(/no public parking lots found/i)).toBeInTheDocument();
  });

  it('routes logged-out finder book action to login with booking redirect', async () => {
    vi.mocked(getPublicParkingFinderResults).mockResolvedValue([
      {
        id: 1,
        name: 'City Mall Parking',
        organizationName: 'Sunrise Properties',
        type: 'MALL',
        address: 'Main Road',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        latitude: null,
        longitude: null,
        baseHourlyRate: '50',
        currency: 'INR',
        openingHours: '24x7',
        totalSlots: 10,
        availableSlots: 4,
        availabilityType: 'LIVE',
        bookable: true,
      },
    ]);

    renderWithProviders(<ParkingFinderPage />);

    expect(await screen.findByText('City Mall Parking')).toBeInTheDocument();
    expect(screen.getByText('Sunrise Properties')).toBeInTheDocument();
    expect(screen.getByText(/4 of 10 slots available/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in to book/i })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fbookings%2Fnew%3FparkingLotId%3D1',
    );
  });

  it('routes authenticated finder book action directly to new booking entry', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getPublicParkingFinderResults).mockResolvedValue([
      {
        id: 5,
        name: 'City Mall Parking',
        organizationName: 'Sunrise Properties',
        type: 'MALL',
        address: 'Main Road',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        latitude: null,
        longitude: null,
        baseHourlyRate: '50',
        currency: 'INR',
        openingHours: '24x7',
        totalSlots: 10,
        availableSlots: 4,
        availabilityType: 'LIVE',
        bookable: true,
      },
    ]);

    renderWithProviders(<ParkingFinderPage />);

    expect(await screen.findByRole('link', { name: /^book$/i })).toHaveAttribute(
      'href',
      '/bookings/new?parkingLotId=5',
    );
  });

  it('does not expose booking entry action for unbookable public lots', async () => {
    vi.mocked(getPublicParkingFinderResults).mockResolvedValue([
      {
        id: 2,
        name: 'Full Parking',
        organizationName: 'Sunrise Properties',
        type: 'MALL',
        address: 'Main Road',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        latitude: null,
        longitude: null,
        baseHourlyRate: '50',
        currency: 'INR',
        openingHours: '24x7',
        totalSlots: 10,
        availableSlots: 0,
        availabilityType: 'LIVE',
        bookable: false,
      },
    ]);

    renderWithProviders(<ParkingFinderPage />);

    expect(await screen.findByText('Full Parking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no slots available/i })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /book/i })).not.toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(getPublicParkingFinderResults).mockRejectedValue(new Error('network'));

    renderWithProviders(<ParkingFinderPage />);

    expect(
      await screen.findByText(/could not load parking lots/i),
    ).toBeInTheDocument();

    consoleErrors.expectNone();
  });
});