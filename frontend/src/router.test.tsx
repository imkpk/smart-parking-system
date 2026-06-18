import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMockUser, createTestQueryClient } from './test/test-utils';
import { ThemeModeProvider } from './providers/ThemeModeProvider';
import { useAuth } from './providers/AuthProvider';

vi.mock('./providers/AuthProvider', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./pages/auth/LoginPage', () => ({
  LoginPage: () => <div>Login Page</div>,
}));

vi.mock('./pages/auth/RegisterPage', () => ({
  RegisterPage: () => <div>Register Page</div>,
}));

vi.mock('./pages/dashboard/AdminDashboardPage', () => ({
  AdminDashboardPage: () => <div>Admin Dashboard Page</div>,
}));

vi.mock('./pages/dashboard/SecurityDashboardPage', () => ({
  SecurityDashboardPage: () => <div>Security Dashboard Page</div>,
}));

vi.mock('./pages/dashboard/UserDashboardPage', () => ({
  UserDashboardPage: () => <div>User Dashboard Page</div>,
}));

vi.mock('./pages/parking-lots/ParkingLotsPage', () => ({
  ParkingLotsPage: () => <div>Parking Lots Page</div>,
}));

vi.mock('./pages/parking-lots/ParkingLotDetailsPage', () => ({
  ParkingLotDetailsPage: () => <div>Parking Lot Details Page</div>,
}));

vi.mock('./pages/vehicles/VehiclesPage', () => ({
  VehiclesPage: () => <div>Vehicles Page</div>,
}));

vi.mock('./pages/bookings/BookingsPage', () => ({
  BookingsPage: () => <div>Bookings Page</div>,
}));

vi.mock('./pages/parking-events/ParkingEventsPage', () => ({
  ParkingEventsPage: () => <div>Parking Events Page</div>,
}));

vi.mock('./pages/payments/PaymentsPage', () => ({
  PaymentsPage: () => <div>Payments Page</div>,
}));

vi.mock('./pages/NotFoundPage', () => ({
  NotFoundPage: () => <div>Not Found Page</div>,
}));

import { router } from './router';

function renderAppRouter() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <RouterProvider router={router} />
      </ThemeModeProvider>
    </QueryClientProvider>,
  );
}

describe('router', () => {
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
  });

  it('resolves public login route', async () => {
    await router.navigate('/login');
    renderAppRouter();

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('resolves protected bookings route for authenticated admin', async () => {
    await router.navigate('/bookings');
    renderAppRouter();

    await waitFor(() => {
      expect(screen.getByText('Bookings Page')).toBeInTheDocument();
    });
  });

  it('resolves admin parking lot details route', async () => {
    await router.navigate('/parking-lots/1');
    renderAppRouter();

    await waitFor(() => {
      expect(screen.getByText('Parking Lot Details Page')).toBeInTheDocument();
    });
  });

  it('resolves unknown routes to not found page', async () => {
    await router.navigate('/does-not-exist');
    renderAppRouter();

    expect(await screen.findByText('Not Found Page')).toBeInTheDocument();
  });
});