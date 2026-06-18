import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/providers/AuthProvider';
import { createMockAuthValue, createMockUser } from '@/test/test-utils';
import { useUserRole } from '@/hooks/useUserRole';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('useUserRole', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthValue({ user: null, token: null, isAuthenticated: false }));
  });

  it('identifies super admin capabilities', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({
        user: createMockUser({ role: 'SUPER_ADMIN', organizationId: null, organization: null }),
      }),
    );

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.isTenantAdmin).toBe(false);
    expect(result.current.isOperationalAdmin).toBe(false);
    expect(result.current.canOperateParkingEvents).toBe(false);
  });

  it('identifies tenant admin capabilities', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'TENANT_ADMIN' }) }),
    );

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isTenantAdmin).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isOperationalAdmin).toBe(true);
    expect(result.current.canOperateParkingEvents).toBe(true);
    expect(result.current.canViewOperationalPayments).toBe(true);
  });

  it('identifies admin capabilities', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'ADMIN' }) }),
    );

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSecurity).toBe(false);
    expect(result.current.isUser).toBe(false);
    expect(result.current.canOperateParkingEvents).toBe(true);
    expect(result.current.canViewOperationalPayments).toBe(true);
  });

  it('identifies security capabilities', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'SECURITY' }) }),
    );

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSecurity).toBe(true);
    expect(result.current.isUser).toBe(false);
    expect(result.current.canOperateParkingEvents).toBe(true);
    expect(result.current.canViewOperationalPayments).toBe(true);
  });

  it('identifies user capabilities', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthValue({ user: createMockUser({ role: 'USER' }) }),
    );

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSecurity).toBe(false);
    expect(result.current.isUser).toBe(true);
    expect(result.current.canOperateParkingEvents).toBe(false);
    expect(result.current.canViewOperationalPayments).toBe(false);
  });
});