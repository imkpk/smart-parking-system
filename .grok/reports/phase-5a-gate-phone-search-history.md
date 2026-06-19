# Phase 5A — Gate Phone Search & Visit History

**Date:** 2026-06-19  
**Branch:** `feature/phase-5a-gate-phone-search-history`  
**PR:** #99 — `feat(security): add phone search and vehicle visit history to gate`  
**Base:** PR #97 mobile security gate (merged)

## Summary

Extends the mobile security gate (`/security/gate`) with phone-number search, multiple-match selection, and vehicle visit history so guards can identify repeat visitors quickly at the gate.

## Backend

- `GET /security/gate/search?q=` accepts booking code, booking no, vehicle number, or phone
- Phone normalization via `security-gate-search.util.ts` (`+91`, 10-digit, spaces/hyphens)
- Tenant-scoped user lookup by phone variants
- `MULTIPLE_MATCHES` when one phone maps to several active bookings
- `SINGLE` result with `vehicleActivity` counts and `recentVisits` (last 5 sessions)
- Visit counts scoped by `vehicleId + organizationId` on existing `ParkingEvent` records
- Preserved check-in / check-out / return-visit rules from PR #97

## Frontend

- Search placeholder and labels include phone number
- Single result card: customer phone, vehicle activity summary (today / 7d / 30d / 1y / last visit)
- Recent visits list (session no, lot/slot, check-in/out, status chip)
- Multiple matches: stacked cards on mobile, compact table on tablet/desktop
- Select flow leads to normal check-in/check-out confirmation

## Tests

- `security-gate.service.spec.ts`: phone multiple matches, tenant scoping, vehicle activity org scoping, no `CHECK_OUT` after completed checkout

## Files

- `backend/src/security/security-gate-search.util.ts`
- `backend/src/security/security-gate.service.ts`
- `backend/src/security/security-gate.types.ts`
- `backend/src/security/security-gate.service.spec.ts`
- `frontend/src/pages/security/SecurityGatePage.tsx`
- `frontend/src/types/securityGate.ts`
- `frontend/src/lib/securityGateMatch.ts`

## Validation

```bash
cd backend && npm run build && npm run test:run -- security-gate.service.spec.ts
cd frontend && npm run build
```

## Deferred

- Cypress smoke for gate phone search (5D stack cleanup)
- Chat MVP (5B–5C) starts after 5A merges