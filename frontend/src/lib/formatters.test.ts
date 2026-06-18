import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatBookingNo,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatReceiptNo,
  formatRupees,
  formatSessionNo,
  formatStatusLabel,
} from './formatters';

describe('formatters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats padded booking, receipt, and session numbers', () => {
    expect(formatBookingNo(1)).toBe('BK-000001');
    expect(formatReceiptNo(42)).toBe('PAY-000042');
    expect(formatSessionNo(999)).toBe('SES-000999');
  });

  describe('formatDuration', () => {
    it('returns dash for null or undefined', () => {
      expect(formatDuration(null)).toBe('-');
      expect(formatDuration(undefined)).toBe('-');
    });

    it('formats minutes', () => {
      expect(formatDuration(90)).toBe('90 min');
    });
  });

  describe('formatStatusLabel', () => {
    it('returns dash for empty status', () => {
      expect(formatStatusLabel(null)).toBe('-');
      expect(formatStatusLabel(undefined)).toBe('-');
      expect(formatStatusLabel('')).toBe('-');
    });

    it('capitalizes first letter and lowercases remainder', () => {
      expect(formatStatusLabel('CONFIRMED')).toBe('Confirmed');
      expect(formatStatusLabel('ACTIVE')).toBe('Active');
    });
  });

  describe('formatDateTime', () => {
    it('returns dash for empty value', () => {
      expect(formatDateTime(null)).toBe('-');
      expect(formatDateTime(undefined)).toBe('-');
    });

    it('formats valid datetime string', () => {
      vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('Jun 18, 2026, 10:00:00 AM');

      expect(formatDateTime('2026-06-18T10:00:00.000Z')).toBe('Jun 18, 2026, 10:00:00 AM');
    });
  });

  describe('formatCurrency', () => {
    it('returns dash for null or undefined amount', () => {
      expect(formatCurrency(null)).toBe('-');
      expect(formatCurrency(undefined)).toBe('-');
    });

    it('formats numeric and string amounts with default currency', () => {
      expect(formatCurrency(80)).toBe('INR 80.00');
      expect(formatCurrency('120.5')).toBe('INR 120.50');
    });

    it('uses custom currency when provided', () => {
      expect(formatCurrency(50, 'USD')).toBe('USD 50.00');
    });
  });

  describe('formatRupees', () => {
    it('returns dash for null or undefined amount', () => {
      expect(formatRupees(null)).toBe('-');
      expect(formatRupees(undefined)).toBe('-');
    });

    it('formats numeric and string amounts in rupees', () => {
      expect(formatRupees(80)).toBe('₹80.00');
      expect(formatRupees('99.9')).toBe('₹99.90');
    });
  });
});