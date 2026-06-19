# Phase 4E — Parking Lot Management UX Polish

**Date:** 2026-06-19  
**Branch:** `fix/phase-4e-parking-lot-management-ux`  
**PR:** `fix(frontend): improve parking lot management workspace UX`

## Summary

Phase 4 visual slot map shipped the operational view, but parking lot management still felt hidden behind an icon-only action and table-heavy pages. Phase 4E polishes the frontend workspace without backend or access-policy changes.

## UX improvements

### Parking lots list (`/parking-lots`)

- Replaced icon-only manage action with labeled **Manage** button (`OpenInNew` icon).
- Parking lot name is a text link; row click navigates to the workspace.
- Edit/Delete remain for ADMIN/TENANT_ADMIN only; SECURITY sees Manage + Details only.
- Compact DataGrid column widths; checkbox column tightened via `gridSx`.
- Accessible `aria-label`s on icon actions.

### Parking lot workspace (`/parking-lots/:id` and related routes)

- Shared `ParkingLotWorkspaceShell` with:
  - Lot name, status chip, location summary, type
  - Primary **Open visual map** CTA (contained)
  - Tabs: Overview, Visual Map, Slots, Floors, Settings (admin only)
- Overview tab leads with operational CTA card before stats/tables.
- Settings tab (ADMIN/TENANT_ADMIN) edits lot metadata in-page.
- SECURITY gets read-only floors/slots tables (no create/edit/delete/bulk actions).

### Visual slot map (`/parking-lots/:id/slot-map`)

- Uses the same workspace shell and tabs so the map feels like the primary operational tab.

## Role behavior

| Role | List | Workspace | Visual map | Destructive actions |
|------|------|-----------|------------|---------------------|
| ADMIN / TENANT_ADMIN | Full | Full | Yes | Yes |
| SECURITY | Manage only | Read-only tables | Yes | Hidden |
| USER | Blocked (route guard) | Blocked | User route only for map | N/A |

## Files

- `frontend/src/components/parking-lots/ParkingLotWorkspaceShell.tsx`
- `frontend/src/lib/parkingLotWorkspace.ts`
- `frontend/src/pages/parking-lots/ParkingLotsPage.tsx`
- `frontend/src/pages/parking-lots/ParkingLotDetailsPage.tsx`
- `frontend/src/pages/parking-lots/VisualSlotMapPage.tsx`
- `frontend/src/components/common/AppDataGrid.tsx` (`onRowClick`, `gridSx`)
- Tests under `frontend/src/test/pages/parking-lots/`

## Validation

```bash
cd frontend && npm run build && npm run test:run
```

## Deferred

- Per-lot Activity tab (no dedicated lot-scoped activity page today)
- Phase 5 mobile security gate
- WebSockets / IoT / chat