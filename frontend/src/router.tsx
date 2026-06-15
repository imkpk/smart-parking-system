import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleHomeRedirect } from './components/auth/RoleHomeRedirect';
import { RoleRoute } from './components/auth/RoleRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { BookingsPage } from './pages/bookings/BookingsPage';
import { AdminDashboardPage } from './pages/dashboard/AdminDashboardPage';
import { SecurityDashboardPage } from './pages/dashboard/SecurityDashboardPage';
import { UserDashboardPage } from './pages/dashboard/UserDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ParkingEventsPage } from './pages/parking-events/ParkingEventsPage';
import { ParkingLotDetailsPage } from './pages/parking-lots/ParkingLotDetailsPage';
import { ParkingLotsPage } from './pages/parking-lots/ParkingLotsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { VehiclesPage } from './pages/vehicles/VehiclesPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <RoleHomeRedirect />,
          },
          {
            element: <RoleRoute allowedRoles={['ADMIN']} />,
            children: [
              {
                path: 'admin/dashboard',
                element: <AdminDashboardPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['SECURITY']} />,
            children: [
              {
                path: 'security/dashboard',
                element: <SecurityDashboardPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['USER']} />,
            children: [
              {
                path: 'user/dashboard',
                element: <UserDashboardPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['ADMIN']} />,
            children: [
              {
                path: 'parking-lots',
                element: <ParkingLotsPage />,
              },
              {
                path: 'parking-lots/:id',
                element: <ParkingLotDetailsPage />,
              },
              {
                path: 'parking-lots/:id/floors',
                element: <ParkingLotDetailsPage />,
              },
              {
                path: 'parking-lots/:id/slots',
                element: <ParkingLotDetailsPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['ADMIN', 'USER']} />,
            children: [
              {
                path: 'vehicles',
                element: <VehiclesPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['ADMIN', 'SECURITY', 'USER']} />,
            children: [
              {
                path: 'bookings',
                element: <BookingsPage />,
              },
              {
                path: 'parking-events',
                element: <ParkingEventsPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['ADMIN', 'USER']} />,
            children: [
              {
                path: 'payments',
                element: <PaymentsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
