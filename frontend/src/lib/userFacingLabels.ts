import { Role } from '../types/auth';

/** Plain-language labels shown to end users (role USER). */
export const userFacingLabels = {
  dashboard: 'My Dashboard',
  bookings: 'Parking Slots',
  bookSlot: 'Book A Slot',
  parkingHistory: 'Parking History',
  paymentHistory: 'Payment History',
} as const;

const userNavLabelByPath: Partial<Record<string, string>> = {
  '/user/dashboard': userFacingLabels.dashboard,
  '/bookings': userFacingLabels.bookings,
  '/parking-events': userFacingLabels.parkingHistory,
  '/payments': userFacingLabels.paymentHistory,
};

export function getNavLabelForRole(path: string, role: Role, defaultLabel: string) {
  if (role !== 'USER') {
    return defaultLabel;
  }

  return userNavLabelByPath[path] ?? defaultLabel;
}