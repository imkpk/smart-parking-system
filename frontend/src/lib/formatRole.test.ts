import { describe, expect, it } from 'vitest';
import { formatRole } from './formatRole';

describe('formatRole', () => {
  it('returns empty string for undefined role', () => {
    expect(formatRole(undefined)).toBe('');
  });

  it('formats known roles', () => {
    expect(formatRole('ADMIN')).toBe('Admin');
    expect(formatRole('SECURITY')).toBe('Security');
    expect(formatRole('USER')).toBe('User');
  });

  it('returns raw value for unknown roles', () => {
    expect(formatRole('CUSTOM')).toBe('CUSTOM');
  });
});