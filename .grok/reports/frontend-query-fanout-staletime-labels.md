# Frontend Query Fan-Out — staleTime + Shared Label Keys

**Branch:** `fix/frontend-query-fanout-staletime-labels`  
**PR title:** `fix(frontend): reduce query fan-out with shared cache keys`  
**Date:** 2026-06-26  
**Agents:** ① Orchestrator · ③ Experience · ⑨ Testing · ⑤ Quality

---

## Summary

Reduces unnecessary API traffic from React Query refetch-on-mount and duplicate cache keys in `useReferenceLabels`.

### Changes

1. **Global `staleTime: 30_000`** in `frontend/src/main.tsx` (preserves `retry: 1`, `refetchOnWindowFocus: false`).
2. **`useReferenceLabels`** now uses shared query keys aligned with list pages:
   - `['bookings', 'my' | 'all']`
   - `['vehicles', 'my' | 'all']`
   - `['users']`
   - `['parking-lots']`
   - `['reference-labels', 'all-slots', lotIds]` (only when `includeParkingStructure: true`)
3. Removed unused `context` parameter from hook and call sites (`PaymentsPage`, `VehiclesPage`).
4. Tests expanded for shared keys, cache reuse, and parking-structure gating.
5. `createTestQueryClient()` mirrors production `staleTime` for consistent test behavior.

### Out of scope (deferred)

- ParkingEventsPage tab-gating
- `invalidateOperationalQueries` narrowing
- Cypress network smoke

---

## Verification

| Command | Result |
|---------|--------|
| `cd frontend && npm run build` | PASS |
| `cd frontend && npm run test:run` | PASS (408 tests) |

---

## Role ⑤ Quality Gate

**Verdict: APPROVE**

| § | Area | Result |
|---|------|--------|
| 1 | Reusable code & duplication | PASS — shared keys reuse existing page caches |
| 2 | Service boundaries | N/A — frontend only |
| 3 | Design patterns | PASS — React Query defaults + hook keys |
| 4 | React Hooks | PASS — no conditional hooks |
| 5 | React Query | PASS — hierarchical shared keys; polling unchanged |
| 6 | MUI / design system | N/A — no UI changes |
| 7 | Tenant-aware | N/A |
| 8 | Backend boundaries | N/A |
| 9 | Payment-service | N/A — no payment-service changes |
| 10 | Tests & CI | PASS — build + 408 tests green |
| 11 | Performance | PASS — reduces duplicate fetches on Payments/Vehicles |
| 12 | Secrets | PASS — none in diff |
| 13 | Agent coverage | PASS — Experience + Testing + Quality |

### Acceptance criteria

- [x] Global query `staleTime` is 30 seconds
- [x] `refetchOnWindowFocus` remains disabled
- [x] `useReferenceLabels` no longer uses context-specific duplicate keys
- [x] Parking structure N×lot fan-out gated behind `includeParkingStructure`
- [x] No backend/payment-service changes
- [x] Frontend build and tests pass

### Notes (non-blocking)

- Pages with explicit local `staleTime` (dashboard, parking-finder, parking-lot workspace on other branches) remain valid overrides.
- Conversation `refetchInterval` polling unaffected by global `staleTime`.

---

## Merge policy

**Do not squash.** Human merges with merge commit after CI green.