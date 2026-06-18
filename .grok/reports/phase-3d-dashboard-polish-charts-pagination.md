# Phase 3D — Dashboard polish (charts + activity pagination)

**Branch:** `feature/phase-3d-dashboard-polish-charts-pagination`  
**PR title:** `feat(dashboard): improve operator dashboard charts and activity pagination`  
**Target:** `develop`  
**Date:** 2026-06-18

## Goal

Make the operator dashboard scannable in ~5 seconds on a laptop: four hero KPIs above the fold, one slot-status visual, compact lot utilization bars, and a cursor-paginated activity timeline.

## Backend

- Added `GET /dashboard/recent-activity?limit=&cursor=` with stable cursor pagination (`checkInTime` + `id` tie-breaker, base64url opaque cursor).
- Bounded `limit` (default 5, max 20); invalid cursor returns `400`.
- Tenant isolation: organization scope for operator roles; `USER` sees own events only; platform `SUPER_ADMIN` (no org) sees cross-tenant feed.
- `operator-metrics` no longer embeds recent activity (empty array); activity loads via the dedicated endpoint.
- Activity items include optional `floorName`.

**Tests:** `phase-3d-dashboard-polish.acceptance.spec.ts`, `recent-activity-cursor.spec.ts`

## Frontend

- **Hero KPI row (4 cards):** utilization %, active sessions, today's check-ins, revenue today (security: check-outs instead of revenue).
- **Slot status:** single `@mui/x-charts` donut (MIT, already planned in design system).
- **Lot utilization:** ranked compact progress bars (top 5), optional “View all lots” link.
- **Recent activity:** timeline feed with icons, vehicle, lot/floor/slot, relative time; `Load more` via React Query infinite query.
- Polished loading, empty, and error states via `EmptyState` and alerts.
- Role layouts preserved: security hides lot list; user shows personal hero KPIs only; platform super admin shows platform KPIs + slot chart.

**Dependency:** `@mui/x-charts` — minimal chart library aligned with MUI 7 theme tokens.

**Tests:** `dashboardPages.test.tsx`, `phase-3d-dashboard-polish.acceptance.test.tsx`, `dashboardApi.test.ts`

## Validation

```bash
cd backend && npm run build && npm run test:run   # 288 tests pass
cd ../frontend && npm run build && npm run test:run
```

Cypress smoke unchanged (no deterministic dashboard feed assertions added).

## Out of scope (Phase 4+)

Visual slot map, mobile security gate, billing, IoT/WebSockets, payment-service changes.