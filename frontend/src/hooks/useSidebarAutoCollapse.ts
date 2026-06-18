import { useCallback, useEffect, useMemo, useRef } from 'react';

export const SIDEBAR_AUTO_COLLAPSE_MS = 2 * 60 * 1000;

export function useSidebarAutoCollapse({
  enabled,
  isExpanded,
  onCollapse,
}: {
  enabled: boolean;
  isExpanded: boolean;
  onCollapse: () => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoCollapseTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleAutoCollapse = useCallback(() => {
    clearAutoCollapseTimer();

    if (!enabled || !isExpanded) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      onCollapse();
      timeoutRef.current = null;
    }, SIDEBAR_AUTO_COLLAPSE_MS);
  }, [clearAutoCollapseTimer, enabled, isExpanded, onCollapse]);

  const resetAutoCollapseTimer = useCallback(() => {
    if (!enabled || !isExpanded) {
      clearAutoCollapseTimer();
      return;
    }

    scheduleAutoCollapse();
  }, [clearAutoCollapseTimer, enabled, isExpanded, scheduleAutoCollapse]);

  useEffect(() => {
    if (enabled && isExpanded) {
      scheduleAutoCollapse();
    } else {
      clearAutoCollapseTimer();
    }

    return clearAutoCollapseTimer;
  }, [clearAutoCollapseTimer, enabled, isExpanded, scheduleAutoCollapse]);

  const sidebarInteractionProps = useMemo(
    () => ({
      onClick: resetAutoCollapseTimer,
      onFocusCapture: resetAutoCollapseTimer,
      onKeyDown: resetAutoCollapseTimer,
      onMouseEnter: resetAutoCollapseTimer,
      onMouseMove: resetAutoCollapseTimer,
    }),
    [resetAutoCollapseTimer],
  );

  return {
    clearAutoCollapseTimer,
    resetAutoCollapseTimer,
    sidebarInteractionProps,
  };
}