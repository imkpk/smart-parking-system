export type StatusStyle = {
  bgcolor: string;
  borderColor: string;
  color: string;
};

export type AppStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'OCCUPIED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'INITIATED'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'PENDING'
  | 'MAINTENANCE';

const successStyle: StatusStyle = {
  bgcolor: 'rgba(46, 125, 50, 0.12)',
  borderColor: 'success.main',
  color: 'success.dark',
};

const errorStyle: StatusStyle = {
  bgcolor: 'rgba(211, 47, 47, 0.12)',
  borderColor: 'error.main',
  color: 'error.dark',
};

const warningStyle: StatusStyle = {
  bgcolor: 'rgba(237, 108, 2, 0.14)',
  borderColor: 'warning.main',
  color: 'warning.dark',
};

const primaryStyle: StatusStyle = {
  bgcolor: 'rgba(21, 101, 192, 0.12)',
  borderColor: 'primary.main',
  color: 'primary.dark',
};

const infoStyle: StatusStyle = {
  bgcolor: 'rgba(2, 136, 209, 0.12)',
  borderColor: 'info.main',
  color: 'info.dark',
};

const neutralStyle: StatusStyle = {
  bgcolor: 'rgba(97, 97, 97, 0.14)',
  borderColor: 'grey.600',
  color: 'text.secondary',
};

export const statusStyles: Record<AppStatus, StatusStyle> = {
  AVAILABLE: successStyle,
  RESERVED: warningStyle,
  OCCUPIED: errorStyle,
  CONFIRMED: successStyle,
  CANCELLED: errorStyle,
  COMPLETED: primaryStyle,
  EXPIRED: neutralStyle,
  ACTIVE: successStyle,
  INITIATED: warningStyle,
  SUCCESS: successStyle,
  FAILED: errorStyle,
  REFUNDED: infoStyle,
  PENDING: infoStyle,
  MAINTENANCE: neutralStyle,
};

export function getStatusStyle(status: string): StatusStyle {
  return statusStyles[status as AppStatus] ?? neutralStyle;
}