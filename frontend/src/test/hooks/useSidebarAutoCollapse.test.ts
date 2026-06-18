import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SIDEBAR_AUTO_COLLAPSE_MS,
  useSidebarAutoCollapse,
} from '@/hooks/useSidebarAutoCollapse';

describe('useSidebarAutoCollapse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('collapses the sidebar after the inactivity timeout', () => {
    const onCollapse = vi.fn();

    renderHook(() =>
      useSidebarAutoCollapse({
        enabled: true,
        isExpanded: true,
        onCollapse,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(SIDEBAR_AUTO_COLLAPSE_MS);
    });

    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('resets the inactivity timer on sidebar interaction', () => {
    const onCollapse = vi.fn();

    const { result } = renderHook(() =>
      useSidebarAutoCollapse({
        enabled: true,
        isExpanded: true,
        onCollapse,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(SIDEBAR_AUTO_COLLAPSE_MS - 1_000);
      result.current.sidebarInteractionProps.onMouseMove?.({} as never);
      vi.advanceTimersByTime(1_000);
    });

    expect(onCollapse).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(SIDEBAR_AUTO_COLLAPSE_MS);
    });

    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('clears the timer when the sidebar is collapsed', () => {
    const onCollapse = vi.fn();

    const { rerender } = renderHook(
      ({ isExpanded }) =>
        useSidebarAutoCollapse({
          enabled: true,
          isExpanded,
          onCollapse,
        }),
      { initialProps: { isExpanded: true } },
    );

    rerender({ isExpanded: false });

    act(() => {
      vi.advanceTimersByTime(SIDEBAR_AUTO_COLLAPSE_MS);
    });

    expect(onCollapse).not.toHaveBeenCalled();
  });
});