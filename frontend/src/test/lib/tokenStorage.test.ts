import { describe, expect, it } from 'vitest';
import { tokenStorage } from '@/lib/tokenStorage';

describe('tokenStorage', () => {
  it('stores and retrieves token', () => {
    tokenStorage.set('abc-token');

    expect(tokenStorage.get()).toBe('abc-token');
  });

  it('clears stored token', () => {
    tokenStorage.set('abc-token');
    tokenStorage.clear();

    expect(tokenStorage.get()).toBeNull();
  });

  it('returns null when no token is stored', () => {
    expect(tokenStorage.get()).toBeNull();
  });
});