import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublicParkingFinderResults } from '@/api/publicParkingFinderApi';
import { ParkingFinderPage } from '@/pages/parking-finder/ParkingFinderPage';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/api/publicParkingFinderApi', () => ({
  getPublicParkingFinderResults: vi.fn(),
}));

describe('ParkingFinderPage', () => {
  beforeEach(() => {
    vi.mocked(getPublicParkingFinderResults).mockResolvedValue([]);
  });

  it('renders public finder without auth', async () => {
    renderWithProviders(<ParkingFinderPage />);

    expect(screen.getByRole('heading', { name: /find parking/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle type/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(getPublicParkingFinderResults).toHaveBeenCalledTimes(1);
    });
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

  it('renders result cards and sign-in action', async () => {
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
    expect(screen.getByRole('link', { name: /sign in to book/i })).toHaveAttribute('href', '/login');
  });

  it('renders error state when API fails', async () => {
    vi.mocked(getPublicParkingFinderResults).mockRejectedValue(new Error('network'));

    renderWithProviders(<ParkingFinderPage />);

    expect(
      await screen.findByText(/could not load parking lots/i),
    ).toBeInTheDocument();
  });
});