import { describe, expect, it } from 'vitest';
import { asMap } from '@/lib/collection';

describe('asMap', () => {
  it('returns empty map for undefined input', () => {
    expect(asMap(undefined)).toEqual(new Map());
  });

  it('returns empty map for empty array', () => {
    expect(asMap([])).toEqual(new Map());
  });

  it('maps items by id', () => {
    const items = [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
    ];

    expect(asMap(items)).toEqual(
      new Map([
        [1, { id: 1, name: 'First' }],
        [2, { id: 2, name: 'Second' }],
      ]),
    );
  });
});