import { describe, expect, it } from 'vitest';
import { isPublicApiRequest } from '@/lib/publicApiPaths';

describe('isPublicApiRequest', () => {
  it('detects public parking finder and branding endpoints', () => {
    expect(isPublicApiRequest('/public/parking-finder')).toBe(true);
    expect(isPublicApiRequest('/organizations/public-branding/default')).toBe(true);
    expect(isPublicApiRequest('/parking-lots')).toBe(false);
  });
});