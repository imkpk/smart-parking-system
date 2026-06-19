import { describe, expect, it } from 'vitest';
import { getNavLabelForRole, userFacingLabels } from '@/lib/userFacingLabels';

describe('userFacingLabels', () => {
  it('uses Book a Slot for the user booking action label', () => {
    expect(userFacingLabels.bookSlot).toBe('Book a Slot');
  });

  it('returns plain-language nav labels for USER role', () => {
    expect(getNavLabelForRole('/user/dashboard', 'USER', 'User Dashboard')).toBe(
      userFacingLabels.dashboard,
    );
    expect(getNavLabelForRole('/bookings', 'USER', 'Bookings')).toBe(userFacingLabels.bookings);
    expect(getNavLabelForRole('/parking-events', 'USER', 'Parking Events')).toBe(
      userFacingLabels.parkingHistory,
    );
    expect(getNavLabelForRole('/payments', 'USER', 'Payments')).toBe(
      userFacingLabels.paymentHistory,
    );
  });

  it('keeps default labels for staff roles', () => {
    expect(getNavLabelForRole('/bookings', 'ADMIN', 'Bookings')).toBe('Bookings');
    expect(getNavLabelForRole('/parking-events', 'SECURITY', 'Parking Events')).toBe(
      'Parking Events',
    );
  });
});