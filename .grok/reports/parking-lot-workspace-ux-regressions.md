# Parking Lot Workspace UX Regressions Fix

**Date:** 2026-06-19  
**Branch:** `fix/parking-lot-workspace-ux-regressions`  
**PR:** `fix(frontend): clean up parking lot workspace navigation`

## Summary

Phase 4E introduced helpful workspace navigation but regressed three UX areas: a squeezed workspace header, duplicated visual map CTAs, and aggressive parking lots table row navigation. This fix is frontend-only and does not change backend, payment-service, or route guards.

## Fixes

### 1. Workspace header layout

- `ParkingLotWorkspaceShell` now uses a horizontal responsive layout aligned with `PageHeader` patterns.
- Lot name uses `flex: 1` / `minWidth: 0` so title and location read at laptop width instead of squeezing into a narrow column.
- Type displays as an outlined chip beside the location summary; status chip stays beside the title.
- Removed `noWrap` on the title so long lot names wrap naturally.

### 2. Visual map CTA deduplication

- Kept **Visual Map** tab and one header **Open visual map** button on non-map tabs.
- Removed the redundant operational overview card CTA from `ParkingLotDetailsPage`.
- Overview tab now leads with stats and parking lot info only.

### 3. Parking lots table navigation

- Removed `onRowClick` row-wide navigation from `ParkingLotsPage`.
- Navigation is limited to:
  - Parking lot name link
  - **Manage** button
- Checkbox selection, Details dialog, Edit, and Delete behave independently.
- Empty row space clicks do nothing.

## Role behavior (unchanged)

| Role | List | Workspace | Visual map | Destructive actions |
|------|------|-----------|------------|---------------------|
| ADMIN / TENANT_ADMIN | Full | Full | Yes | Yes |
| SECURITY | Manage only | Read-only tables | Yes | Hidden |
| USER | Blocked (route guard) | Blocked | User route only for map | N/A |

## Files changed

- `frontend/src/components/parking-lots/ParkingLotWorkspaceShell.tsx`
- `frontend/src/pages/parking-lots/ParkingLotsPage.tsx`
- `frontend/src/pages/parking-lots/ParkingLotDetailsPage.tsx`
- `frontend/src/test/pages/parking-lots/ParkingLotsPage.test.tsx`
- `frontend/src/test/pages/parking-lots/ParkingLotDetailsPage.test.tsx`
- `frontend/src/test/pages/parking-lots/phase-4e-parking-lot-management-ux.test.tsx`

## Tests added/updated

- Row empty-area click does not navigate
- Parking lot name link navigates
- Checkbox click only selects
- Single visual map CTA on overview workspace
- Operational overview card removed
- Existing visual slot map and workspace tests still pass

## Validation

```bash
cd frontend && npm run build && npm run test:run
```

**Result:** build ✅, **374** tests passed (64 files).

## Deferred

- Phase 5 mobile security gate — not started per scope.