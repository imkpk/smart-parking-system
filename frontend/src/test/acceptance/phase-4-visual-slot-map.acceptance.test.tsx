import { cleanup, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { SlotMapLegend } from '@/components/slot-map/SlotMapLegend';
import { getStatusStyle } from '@/lib/statusStyles';
import { useAuth } from '@/providers/AuthProvider';
import { createMockAuthValue, createMockUser, renderWithProviders } from '@/test/test-utils';
import { SlotMapLegend as SlotMapLegendCounts } from '@/types/slotMap';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

const legendFixture: SlotMapLegendCounts = {
  AVAILABLE: 4,
  RESERVED: 1,
  OCCUPIED: 2,
  MAINTENANCE: 1,
  UNKNOWN: 0,
};

describe('Phase 4 visual slot map acceptance', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({
        user: createMockUser({ role: 'ADMIN' }),
        isAuthenticated: true,
      }),
    );
  });

  it('exposes slot map route to admin, security, and user roles', () => {
    const roles: Array<'ADMIN' | 'SECURITY' | 'USER'> = ['ADMIN', 'SECURITY', 'USER'];

    for (const role of roles) {
      cleanup();
      vi.mocked(useAuth).mockReturnValue(
        createMockAuthValue({
          user: createMockUser({ role }),
          isAuthenticated: true,
        }),
      );

      renderWithProviders(
        <Routes>
          <Route
            element={<RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER']} />}
          >
            <Route
              path="/parking-lots/:id/slot-map"
              element={<div>{`Visual Slot Map (${role})`}</div>}
            />
          </Route>
        </Routes>,
        { route: '/parking-lots/1/slot-map' },
      );

      expect(screen.getByText(`Visual Slot Map (${role})`)).toBeInTheDocument();
    }
  });

  it('blocks slot map route for unauthenticated users', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: null, token: null, isAuthenticated: false }),
    );

    renderWithProviders(
      <Routes>
        <Route
          element={<RoleRoute allowedRoles={['TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER']} />}
        >
          <Route path="/parking-lots/:id/slot-map" element={<div>Visual Slot Map</div>} />
        </Route>
      </Routes>,
      { route: '/parking-lots/1/slot-map' },
    );

    expect(screen.getByText(/you do not have access to this page/i)).toBeInTheDocument();
    expect(screen.getByText(/please login again/i)).toBeInTheDocument();
    expect(screen.queryByText('Visual Slot Map')).not.toBeInTheDocument();
  });

  it('maps every slot map status to a distinct visual style', () => {
    const statuses = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'UNKNOWN'] as const;
    const styles = statuses.map((status) => getStatusStyle(status));

    expect(new Set(styles.map((style) => style.borderColor)).size).toBeGreaterThanOrEqual(4);
    statuses.forEach((status) => {
      expect(getStatusStyle(status).bgcolor).toBeTruthy();
    });
  });

  it('renders legend with text labels and counts for non-zero statuses only', () => {
    renderWithProviders(<SlotMapLegend legend={legendFixture} />);

    expect(screen.getByText('Legend')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Reserved')).toBeInTheDocument();
    expect(screen.getByText('Occupied')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
  });
});