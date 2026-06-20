const INDIAN_MOBILE_DIGITS = /^[6-9]\d{9}$/;

export function normalizeIndianPhone(digits: string) {
  const trimmed = digits.replace(/\D/g, '').slice(0, 10);

  if (!INDIAN_MOBILE_DIGITS.test(trimmed)) {
    return null;
  }

  return `+91${trimmed}`;
}

export function isValidIndianPhoneDigits(digits: string) {
  return INDIAN_MOBILE_DIGITS.test(digits.replace(/\D/g, '').slice(0, 10));
}