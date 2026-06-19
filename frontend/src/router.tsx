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
import { VisualSlotMapPage } from './pages/parking-lots/VisualSlotMapPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { BrandingSettingsPage } from './pages/settings/BrandingSettingsPage';
import { SecurityGatePage } from './pages/security/SecurityGatePage';
import { UserSupportPage } from './pages/support/UserSupportPage';
import { VehiclesPage } from './pages/vehicles/VehiclesPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/:tenantSlug',
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
            element: <RoleRoute allowedRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN']} />,
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
            element: <RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'SECURITY']} />,
            children: [
              {
                path: 'security/gate',
                element: <SecurityGatePage />,
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
              {
                path: 'support',
                element: <UserSupportPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['SUPER_ADMIN', 'TENANT_ADMIN']} />,
            children: [
              {
                path: 'admin/branding',
                element: <BrandingSettingsPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'SECURITY']} />,
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
              {
                path: 'parking-lots/:id/slot-map',
                element: <VisualSlotMapPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['USER']} />,
            children: [
              {
                path: 'parking-lots/:id/slot-map',
                element: <VisualSlotMapPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'USER']} />,
            children: [
              {
                path: 'vehicles',
                element: <VehiclesPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER']} />,
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
            element: <RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER']} />,
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
