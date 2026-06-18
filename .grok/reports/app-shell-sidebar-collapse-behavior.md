# App Shell Sidebar Collapse Behavior

**Date:** 2026-06-19  
**Branch:** `fix/app-shell-sidebar-collapse-behavior`  
**PR title:** `fix(frontend): collapse sidebar by default and auto-close after inactivity`

## Problem

The desktop sidebar opened expanded by default, taking horizontal space away from dashboard content. Operators had to manually collapse it on every session.

## Solution

| Behavior | Implementation |
|----------|----------------|
| Default collapsed | `useState(false)` for `isSidebarOpen` on desktop permanent drawer |
| Manual toggle | Existing menu / menu-open icon buttons unchanged |
| Icon-only collapsed rail | Existing `collapsedDrawerWidth` (80px) + nav tooltips |
| Auto-collapse | `useSidebarAutoCollapse` hook — 2 minute inactivity timer |
| Interaction reset | `mouseenter`, `mousemove`, `focus` capture, `click`, `keydown` on desktop drawer wrapper |
| Mobile | Temporary drawer unchanged; auto-collapse disabled when `isMobile` |
| Cleanup | `clearTimeout` on unmount and when sidebar collapses |

## Files

- `frontend/src/hooks/useSidebarAutoCollapse.ts` — timer logic + interaction props
- `frontend/src/components/layout/AppLayout.tsx` — default state, hook wiring, drawer wrapper
- `frontend/src/test/hooks/useSidebarAutoCollapse.test.ts` — hook unit tests (fake timers)
- `frontend/src/test/components/layout/AppLayout.test.tsx` — shell integration tests

## Validation

```bash
cd frontend
npm run build
npm run test:run
```

## Out of scope

Dashboard API/charts, backend, payment-service, Phase 4 slot map.