import { describe, expect, it } from 'vitest';
import { isPublicAppPath } from '@/lib/publicRoutes';

describe('isPublicAppPath', () => {
  it('matches parking finder and auth entry routes', () => {
    expect(isPublicAppPath('/parking-finder')).toBe(true);
    expect(isPublicAppPath('/login')).toBe(true);
    expect(isPublicAppPath('/login/default')).toBe(true);
    expect(isPublicAppPath('/bookings')).toBe(false);
  });
});