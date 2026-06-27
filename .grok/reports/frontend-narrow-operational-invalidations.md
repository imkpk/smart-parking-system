# Frontend Narrow Operational Invalidations

**Status:** PR #153 merged
**Branch:** `fix/frontend-narrow-operational-invalidations`  
**PR title:** `fix(frontend): narrow parking operation query invalidations`  
**PR:** https://github.com/imkpk/smart-parking-system/pull/153
**Date:** 2026-06-27

## Summary

Replaced broad React Query invalidations after parking check-in/check-out and related booking create/cancel reservation operations with targeted invalidations for affected operational data. The change keeps active events, history/all data, booking data, lot/slot map data, dashboard activity/metrics, and checkout-created payments fresh without invalidating whole root namespaces.

## Activated agents

| Agent | ID | Result |
|-------|----|--------|
| Orchestrator | ① | Phase 0 merge sync, query-key inspection, plan |
| Experience | ③ | Frontend invalidation implementation |
| Testing | ⑨ | Focused Vitest updates |
| Quality | ⑤ | APPROVE |
| Documentation | ⑩ | Report, indexes, changelog |

## Files changed

- `frontend/src/lib/invalidateOperationalQueries.ts`
- `frontend/src/pages/parking-events/ParkingEventsPage.tsx`
- `frontend/src/pages/security/SecurityGatePage.tsx`
- `frontend/src/pages/bookings/BookingsPage.tsx`
- `frontend/src/test/lib/invalidateOperationalQueries.test.ts`
- `frontend/src/test/pages/parking-events/ParkingEventsPage.test.tsx`
- `frontend/src/test/pages/bookings/BookingsPage.test.tsx`
- `.grok/agent-runs/2026-06-27-fix-frontend-narrow-operational-invalidations/**`
- `.grok/agent-runs/README.md`
- `.grok/reports/README.md`
- `MASTER_PROMPT.md`

## Invalidation changes made

- Replaced root `['parking-events']` with targeted `['parking-events', 'active']`, `['parking-events', 'all']`, and checkout-only `['parking-events', 'history']`.
- Replaced root `['bookings']` with `['bookings', 'all']`, `['bookings', 'my']`, and `['bookings', bookingId]` when available.
- Replaced root `['slot-map']` with `['slot-map', parkingLotId]`.
- Replaced root `['dashboard']` with `['dashboard', 'operator-metrics']` and `['dashboard', 'recent-activity']`, avoiding onboarding/dashboard-wide invalidation.
- Added checkout payment invalidations for `['payments', 'summary']`, `['payments', 'all']`, and `['payments', 'user', userId]`.
- Added affected lot detail and slot-list invalidations for `['parking-lots', parkingLotId]` and `['parking-lots', parkingLotId, 'slots']`.
- ParkingEventsPage and SecurityGatePage now pass `operation`, `bookingId`, `parkingLotId`, and `userId` from mutation results.
- BookingsPage create/cancel now invalidate targeted booking list/detail, affected lot detail/slots, affected slot map, and create-only affected available-slots keys instead of `['bookings']` and `['parking-lots']`.

## Broad invalidations left

- The helper retains `invalidateQueries({ exact: true, queryKey: ['parking-lots'] })` only as a fallback when no `parkingLotId` is available. Current check-in/check-out flows pass `parkingLotId`, so this fallback is not used by the Step 4 operational paths. It is exact to avoid cascading into lot detail, slots, available-slots, or slot-map keys.
- Existing broad invalidations remain outside Step 4 scope in `PaymentsPage` payment-status mutations and `ParkingLotDetailsPage` lot-management mutations. They were not changed because this PR is limited to parking operation/check-in/check-out and related booking reservation invalidations.

## Tests run

| Command | Result |
|---------|--------|
| `cd frontend && npm run test:run -- ParkingEventsPage.test.tsx` | PASS - 13 tests, 41.04s final run |
| `cd frontend && npm run test:run -- BookingsPage.test.tsx` | PASS - 9 tests, 32.88s final run |
| `cd frontend && npm run test:run -- invalidateOperationalQueries.test.ts` | PASS - 3 tests, 3.87s final run |
| `cd frontend && npm run build` | PASS - existing Vite chunk/dynamic import warnings only |
| `cd frontend && npm run test:run` | PASS - 73 files, 418 tests, 485.36s final run |

## Quality verdict

`APPROVE`

Step 4 only. No backend changes, no `payment-service/` changes, no deployment/secrets changes, and no UI redesign.
