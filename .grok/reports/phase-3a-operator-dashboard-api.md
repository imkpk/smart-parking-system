# Phase 3A — Operator Dashboard API Report

**Date:** 2026-06-18  
**Branch:** `feature/phase-3a-operator-dashboard-api`  
**PR:** `feat(backend): add operator dashboard metrics API`

## Delivered

Unified tenant-scoped operator dashboard metrics API at `GET /dashboard/operator-metrics`.

### Roles and scopes

| Role | Scope | Metrics |
|------|-------|---------|
| `ADMIN`, `TENANT_ADMIN` | `TENANT` | Occupancy, bookings, parking events, revenue (parking fees), recent activity, lot utilization |
| `SUPER_ADMIN` (no org) | `PLATFORM` | Cross-tenant overview + aggregate occupancy/events/bookings |
| `SUPER_ADMIN` (with org) | `TENANT` | Same as tenant admin |
| `SECURITY` | `TENANT` | Occupancy, today's bookings, active events, check-in/out counts, recent activity |
| `USER` | `USER` | Personal vehicles, upcoming bookings, active/completed events, recent activity |

### Response contract

Key sections in `OperatorDashboardMetrics`:

- `occupancy` — slot counts + utilization %
- `bookings` — total/today/week + status breakdown
- `parkingEvents` — active/completed + today's check-ins/outs
- `revenue` — collected parking fees from completed events (`feeAmount`, INR only)
- `recentActivity` — latest parking events with check-in/out labels
- `lotUtilization` — per-lot occupancy (tenant admin/operator roles)
- `platformOverview` — SUPER_ADMIN platform scope only
- `userOverview` — USER scope only

### Revenue note

Revenue uses **completed parking event fees** in the main database. Payment microservice data is not queried (per Phase 3 scope).

## Files

```text
backend/src/dashboard/types/operator-dashboard-metrics.type.ts
backend/src/dashboard/operator-dashboard-metrics.builder.ts
backend/src/dashboard/operator-dashboard-metrics.builder.spec.ts
backend/src/dashboard/dashboard.service.ts
backend/src/dashboard/dashboard.service.spec.ts
backend/src/dashboard/dashboard.controller.ts
backend/src/controllers.spec.ts
```

## Validation

```bash
cd backend && npm run build && npm run test:run
```

## Next

PR 3B — frontend operator dashboard UI consuming `GET /dashboard/operator-metrics`.