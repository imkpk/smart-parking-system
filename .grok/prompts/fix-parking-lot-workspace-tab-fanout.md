# Parking Lot Workspace Tab Fan-Out

## Goal

Reduce duplicate API calls when switching Visual Map ↔ Slots tabs in the parking lot workspace. Shared React Query keys and `staleTime: 30s` so tab switches reuse cached `parking-lots`, `floors`, `slots`, and `slot-map` data instead of refetching on every mount.

**PR:** [#143](https://github.com/imkpk/smart-parking-system/pull/143) (same branch as dashboard fan-out fix) — merged 2026-06-26

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes | Bundled in #143 branch |
| ② Core API | No | |
| ③ Experience | Yes | Parking lot workspace pages |
| ④ Payments | No | |
| ⑤ Quality, Architecture & Release | Yes | Review |
| ⑪ Performance | Yes | Tab-switch fan-out |

## Agent activation

| Agent | ID | Activated | Reason |
|-------|----|-----------|--------|
| Orchestrator | ① | Yes | Always |
| Experience Agent | ③ | Yes | `ParkingLotDetailsPage`, `VisualSlotMapPage` |
| Performance Agent | ⑪ | Yes | User-reported duplicate XHR on tab toggle |
| Quality Agent | ⑤ | Yes | Always — runs last |

## Allowed paths

```text
frontend/src/lib/parkingLotQueryOptions.ts
frontend/src/pages/parking-lots/ParkingLotDetailsPage.tsx
frontend/src/pages/parking-lots/VisualSlotMapPage.tsx
```

## Forbidden paths

```text
backend/
payment-service/
unrelated parking lot UX changes
```

## Branch name

`fix/dashboard-onboarding-fanout` (committed as `fix(frontend): reduce API fan-out when switching visual map and slots tabs`)

## Scope

1. **`parkingLotQueryOptions.ts`** — Export `PARKING_LOT_QUERY_STALE_MS = 30_000`; helpers `parkingLotWorkspaceNeedsFloors(tab)` and `parkingLotWorkspaceNeedsSlots(tab)` to gate queries by active tab.
2. **`ParkingLotDetailsPage.tsx`** — Align query keys with visual map page; apply shared `staleTime`; avoid refetch-on-tab-switch when cache is fresh.
3. **`VisualSlotMapPage.tsx`** — Reuse shared parking lot / floors / slots query options and stale window.

## Out of scope

- Global React Query defaults (PR #144)
- Dashboard onboarding aggregation (separate scope in same PR branch)
- Backend API changes

## Acceptance criteria

- [ ] Toggling Visual Map ↔ Slots repeatedly does not refetch all resources when cache is < 30s fresh
- [ ] Network tab shows 304/cache hits or fewer duplicate calls vs before
- [ ] Workspace tabs still show correct data after mutations (invalidation unchanged)
- [ ] Frontend build + tests pass

## Code quality requirements

- Centralize stale time and tab-gating in `parkingLotQueryOptions.ts`
- Reuse existing query key conventions from parking lot pages

## React Hooks requirements

- Tab-gated `enabled` on queries; hooks at top level only

## Design-system requirements

N/A — no UI changes.

## Backend architecture requirements

N/A

## Payment requirements

N/A

## Performance requirements

- `staleTime: 30_000` on workspace lot/floor/slot/slot-map queries
- Shared query keys between `ParkingLotDetailsPage` and `VisualSlotMapPage`
- Tab-aware `enabled` to avoid fetching floors/slots on settings tab

## Build/test commands

```bash
cd frontend && npm run build && npm run test:run
```

## Manual verification steps

1. Open a parking lot workspace with Visual Map and Slots tabs
2. DevTools Network — toggle Visual Map → Slots → Visual Map → Slots
3. Confirm no burst of duplicate `parking-lots`, `floors`, `slots`, `slot-map` calls (304s or cache reuse)

## Expected report file

N/A — bundled in PR #143; no separate report.

## Original task prompt (2026-06-26)

User reported excessive API calls when switching tabs:

> “i clicked on visual map then i clicked slots then i clicked visual map then i clicked slots these many api calls are happenning”

Network log showed repeated 304s for `parkingLotsApi`, `floorsApi`, `slotsApi`, `slotMapApi` on each tab switch.

Fix with shared React Query cache keys + 30s staleTime in parking lot workspace.