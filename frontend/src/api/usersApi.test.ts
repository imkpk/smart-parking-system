import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('./client', () => ({
  apiClient: {
    get: getMock,
  },
}));

import { getUsers } from './usersApi';

describe('usersApi', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('getUsers fetches all users', async () => {
    const users = [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        phone: null,
        role: 'ADMIN' as const,
        isActive: true,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    ];
    getMock.mockResolvedValue({ data: users });

    const result = await getUsers();

    expect(getMock).toHaveBeenCalledWith('/users');
    expect(result).toEqual(users);
  });
});