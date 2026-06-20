const INDIAN_MOBILE_DIGITS = /^[6-9]\d{9}$/;

export function normalizeIndianPhone(value: string): string | null {
  const compact = value.replace(/[\s-]/g, '');

  if (!compact) {
    return null;
  }

  if (compact.startsWith('+91')) {
    const digits = compact.slice(3);
    return INDIAN_MOBILE_DIGITS.test(digits) ? `+91${digits}` : null;
  }

  if (/^91\d{10}$/.test(compact)) {
    const digits = compact.slice(2);
    return INDIAN_MOBILE_DIGITS.test(digits) ? `+91${digits}` : null;
  }

  if (/^\d{10}$/.test(compact)) {
    return INDIAN_MOBILE_DIGITS.test(compact) ? `+91${compact}` : null;
  }

  return null;
}

export function isEmailIdentifier(value: string) {
  return value.includes('@');
}