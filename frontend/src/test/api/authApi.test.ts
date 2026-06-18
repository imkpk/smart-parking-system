import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
  },
}));

import { getCurrentUser, login, register } from '@/api/authApi';

const authResponse = {
  user: {
    id: 1,
    name: 'Test User',
    email: 'user@example.com',
    phone: null,
    role: 'USER' as const,
    isActive: true,
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:00:00.000Z',
  },
  accessToken: 'token-123',
};

describe('authApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  describe('login', () => {
    it('posts credentials and returns auth response', async () => {
      postMock.mockResolvedValue({ data: authResponse });

      const payload = { email: 'user@example.com', password: 'secret' };
      const result = await login(payload);

      expect(postMock).toHaveBeenCalledWith('/auth/login', payload);
      expect(result).toEqual(authResponse);
    });
  });

  describe('register', () => {
    it('posts registration payload and returns auth response', async () => {
      postMock.mockResolvedValue({ data: authResponse });

      const payload = {
        name: 'Test User',
        email: 'user@example.com',
        password: 'secret',
      };
      const result = await register(payload);

      expect(postMock).toHaveBeenCalledWith('/auth/register', payload);
      expect(result).toEqual(authResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user profile', async () => {
      getMock.mockResolvedValue({ data: authResponse.user });

      const result = await getCurrentUser();

      expect(getMock).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(authResponse.user);
    });
  });
});