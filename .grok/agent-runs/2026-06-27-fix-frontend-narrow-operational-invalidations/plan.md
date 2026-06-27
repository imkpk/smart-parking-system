# Plan - Narrow Frontend Operational Invalidations

## Phase 0

- Checked out `develop` and pulled latest from `origin/develop`.
- Confirmed PR #151 is merged at merge commit `963296c`.
- Confirmed PR #152 is merged into local `develop` at merge commit `012e0a4`.
- Confirmed local `develop` was clean before creating `fix/frontend-narrow-operational-invalidations`.

## Scope

- Frontend-only parking operation cache invalidation narrowing.
- Check-in/check-out flows in `ParkingEventsPage` and `SecurityGatePage`.
- Shared invalidation helper and focused frontend tests.
- `.grok` run/report documentation and project changelog/index updates.

## Out of scope

- Step 5 Parking Finder booking entry flow.
- Backend API changes.
- `payment-service/`.
- Deployment config, secrets, `.env` values.
- UI redesign or unrelated page behavior.
- Broad payment mutation invalidations outside parking operation check-in/out.

## Target files

| File | Purpose |
|------|---------|
| `frontend/src/lib/invalidateOperationalQueries.ts` | Replace root-key operational invalidations with targeted keys |
| `frontend/src/pages/parking-events/ParkingEventsPage.tsx` | Pass operation-specific context into invalidation helper |
| `frontend/src/pages/security/SecurityGatePage.tsx` | Pass booking/event context from gate operations |
| `frontend/src/pages/bookings/BookingsPage.tsx` | Narrow related booking create/cancel reservation invalidations |
| `frontend/src/test/lib/invalidateOperationalQueries.test.ts` | Unit coverage for targeted helper behavior and no broad keys |
| `frontend/src/test/pages/parking-events/ParkingEventsPage.test.tsx` | Page-level coverage for check-in/check-out targeted invalidation |
| `frontend/src/test/pages/bookings/BookingsPage.test.tsx` | Page-level coverage for booking create/cancel targeted invalidation |
| `.grok/agent-runs/2026-06-27-fix-frontend-narrow-operational-invalidations/**` | Agent-run traceability |
| `.grok/reports/frontend-narrow-operational-invalidations.md` | Completion report |
| `.grok/agent-runs/README.md` | Run index |
| `.grok/reports/README.md` | Report index |
| `MASTER_PROMPT.md` | Changelog/status update per project convention |

## Query keys found

| Area | Query keys |
|------|------------|
| Parking events active | `['parking-events', 'active']` |
| Parking events history/all | `['parking-events', 'history']`, `['parking-events', 'all']` |
| Bookings | `['bookings', 'my']`, `['bookings', 'all']` |
| Parking lots list/detail | `['parking-lots']`, `['parking-lots', parkingLotId]` |
| Available slots | `['parking-lots', parkingLotId, 'available-slots', vehicleType]` |
| Parking lot slots/floors | `['parking-lots', parkingLotId, 'slots']`, `['parking-lots', parkingLotId, 'floors']` |
| Slot map | `['slot-map', parkingLotId, slotMapQuery]` |
| Dashboard | `['dashboard', 'operator-metrics']`, `['dashboard', 'recent-activity', search]`, `['dashboard', 'onboarding-status']` |
| Payments | `['payments', 'summary']`, `['payments', 'all']`, `['payments', 'user', userId]` |

## Broad invalidations currently found

`frontend/src/lib/invalidateOperationalQueries.ts` currently invalidates root keys after every operation:

- `['dashboard']`
- `['parking-events']`
- `['bookings']`
- `['parking-lots']`
- `['slot-map']`

It also invalidates `['parking-lots', parkingLotId]` when an ID is available.

## Implementation plan

1. Replace root-key invalidations with explicit known impacted keys.
2. Always invalidate active parking events after check-in/check-out.
3. Invalidate admin all/history and user history event lists only when needed by operation result.
4. Invalidate booking list variants and specific booking detail when `bookingId` is available.
5. Invalidate specific parking lot detail, lot slots, available slots for the operation vehicle type when available, and slot-map entries for the affected lot only.
6. Invalidate dashboard operator-metrics/recent-activity only, not the entire dashboard namespace.
7. Narrow related booking create/cancel invalidations because they reserve/release slot state.
8. Keep no broad invalidations unless a missing ID makes a targeted key impossible, and document any such case.

## Active agents this run

| Agent | ID | Reason activated |
|-------|----|------------------|
| Orchestrator | ① | Always; Phase 0, query-key inspection, planning, PR |
| Experience | ③ | `frontend/src/` React Query invalidation behavior |
| Testing | ⑨ | Frontend tests for changed invalidation logic |
| Quality | ⑤ | Mandatory final quality and release gate |
| Documentation | ⑩ | `.grok` report/indexes and `MASTER_PROMPT.md` changelog |
