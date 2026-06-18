import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../providers/AuthProvider';
import { createMockUser } from '../test/test-utils';
import { useUserRole } from './useUserRole';

vi.mock('../providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('useUserRole', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('identifies admin capabilities', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSecurity).toBe(false);
    expect(result.current.isUser).toBe(false);
    expect(result.current.canOperateParkingEvents).toBe(true);
    expect(result.current.canViewOperationalPayments).toBe(true);
  });

  it('identifies security capabilities', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SECURITY' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSecurity).toBe(true);
    expect(result.current.isUser).toBe(false);
    expect(result.current.canOperateParkingEvents).toBe(true);
    expect(result.current.canViewOperationalPayments).toBe(true);
  });

  it('identifies user capabilities', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER' }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSecurity).toBe(false);
    expect(result.current.isUser).toBe(true);
    expect(result.current.canOperateParkingEvents).toBe(false);
    expect(result.current.canViewOperationalPayments).toBe(false);
  });
});