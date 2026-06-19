const BOOKING_NO_PATTERN = /^BK-0*(\d+)$/i;
const VEHICLE_PLATE_PATTERN = /[A-Z]/i;

export function stripTrailingParens(value: string) {
  let normalized = value.trim();

  while (normalized.endsWith(')')) {
    normalized = normalized.slice(0, -1).trimEnd();
  }

  return normalized;
}

export function parseBookingNo(query: string) {
  const match = query.match(BOOKING_NO_PATTERN);

  if (!match) {
    return null;
  }

  const bookingId = Number(match[1]);

  return Number.isInteger(bookingId) && bookingId > 0 ? bookingId : null;
}

export function isBookingReferenceSearch(searchTerm: string, bookingIdFromLabel: number | null) {
  return bookingIdFromLabel !== null || searchTerm.startsWith('BK-');
}

export function normalizePhoneSearchQuery(query: string) {
  const stripped = stripTrailingParens(query);
  const compact = stripped.replace(/[\s-]/g, '');

  if (!compact) {
    return null;
  }

  if (compact.startsWith('+91')) {
    const digits = compact.slice(3);

    return /^\d{10}$/.test(digits) ? `+91${digits}` : null;
  }

  if (/^91\d{10}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^\d{10}$/.test(compact)) {
    return `+91${compact}`;
  }

  return null;
}

export function isPhoneSearchQuery(query: string) {
  const stripped = stripTrailingParens(query);
  const upper = stripped.toUpperCase();

  if (isBookingReferenceSearch(upper, parseBookingNo(upper))) {
    return false;
  }

  const compact = stripped.replace(/[\s-]/g, '');

  if (VEHICLE_PLATE_PATTERN.test(compact.replace(/^\+?91/, ''))) {
    return false;
  }

  return normalizePhoneSearchQuery(query) !== null;
}

export function buildPhoneSearchVariants(normalizedPhone: string) {
  const variants = new Set<string>([normalizedPhone]);
  const digits = normalizedPhone.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    variants.add(`+${digits}`);
    variants.add(digits.slice(2));
    variants.add(digits);
  }

  if (digits.length === 10) {
    variants.add(`+91${digits}`);
    variants.add(`91${digits}`);
    variants.add(digits);
  }

  return [...variants];
}

export function formatGateBookingNo(bookingId: number) {
  return `BK-${String(bookingId).padStart(6, '0')}`;
}

export function formatGateSessionNo(sessionId: number) {
  return `SES-${String(sessionId).padStart(6, '0')}`;
}