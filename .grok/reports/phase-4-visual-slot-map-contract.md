# Phase 4 — Visual Slot Map Contract

**Status:** In progress (LOOP 4A)  
**Branch:** `docs/phase-4-visual-slot-map-contract`  
**Scope:** API/UI contract for tenant-scoped visual slot map (no runtime code in this loop)

## Summary

Phase 4 delivers a **visual slot map** so operators can understand parking lot health at a glance and interact with slots without reading a DataGrid. The map uses **existing slot/booking/event data** — no WebSockets, IoT, floor-plan coordinates, or map image upload in this phase.

## Current baseline (Phase 3 complete)

| Area | State |
|------|-------|
| Slot model | `Slot` with `slotNumber`, `slotType`, `status`, `floorId` — **no x/y coordinates** |
| Slot status enum | `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE` |
| Slot type enum | `CAR`, `BIKE`, `EV`, `HANDICAPPED` |
| Slot list API | `GET /parking-lots/:id/slots` (ADMIN, SECURITY) |
| Available slots API | `GET /parking-lots/:id/available-slots` (USER, ADMIN, SECURITY) |
| Frontend slots UI | `ParkingLotDetailsPage` Slots tab — DataGrid + filters |
| Status visuals | `SlotStatusChip`, `getStatusStyle()` in `frontend/src/lib/statusStyles.ts` |
| Deep link | Dashboard donut → `/parking-lots/:id/slots?status=AVAILABLE` |
| Tenant isolation | `AccessPolicyService`, `ParkingLotValidationService` |

## Product goals

1. Operators see **floor-grouped slot cards** with color + label/icon (not color alone).
2. Click a slot → **detail drawer/dialog** with status, type, floor, safe booking/event summary.
3. **Filters:** floor, status, vehicle type, slot number search.
4. **Role-safe views** — no cross-tenant leakage, no PII/revenue on SECURITY/USER paths.
5. **Laptop-first** layout; basic mobile usability (Phase 5 optimizes guard mobile).

## Non-goals (Phase 4)

- WebSocket / live push updates (future: poll or SSE extension)
- IoT / sensor occupancy
- Camera / ANPR
- CAD floor-plan editor or image upload
- Payment / billing changes
- Dashboard redesign
- `single-tenant` branch changes

---

## Visual status model

### Canonical statuses (from Prisma)

| Status | Meaning | Visual (reuse `statusStyles`) |
|--------|---------|-------------------------------|
| `AVAILABLE` | Open for booking/check-in | Green + "Available" label |
| `RESERVED` | Active booking holds slot | Orange + "Reserved" label |
| `OCCUPIED` | Vehicle checked in | Red + "Occupied" label |
| `MAINTENANCE` | Out of service | Grey + "Maintenance" label |
| `UNKNOWN` | Fallback if data inconsistent | Neutral + "Unknown" label |

**Rule:** Every slot card shows **status text + chip/icon**, not color alone. Include a **legend** component mapping status → color + label.

### Slot type indicators

Reuse `SlotType` with compact icon or abbreviation on each card:

| Type | Marker |
|------|--------|
| `CAR` | Car icon / "Car" |
| `BIKE` | Two-wheeler icon / "Bike" |
| `EV` | EV icon / "EV" |
| `HANDICAPPED` | Accessible icon / "Accessible" |

---

## Layout model (no physical coordinates)

Backend has **no x/y fields**. Layout is a **logical grid**:

```text
For each floor (sorted by level, then name):
  slots sorted by slotNumber (natural sort)
  render as responsive CSS grid (auto-fill, min card width ~96–120px)
  scroll inside page content area when many slots
```

Do **not** invent floor-plan coordinates unless schema gains them in a future phase.

---

## Backend API contract

### Endpoint

```
GET /api/parking-lots/:parkingLotId/slot-map
```

**Auth:** JWT + RolesGuard  
**Module:** extend `slots` or add `slot-map` under `parking-lots` (prefer colocated with slots service).

### Query parameters

| Param | Type | Description |
|-------|------|-------------|
| `floorId` | number (optional) | Restrict slots to one floor; omit = all floors grouped |
| `status` | `SlotStatus` (optional) | Filter slots by status |
| `vehicleType` | `SlotType` (optional) | Filter slots by type |

Invalid enum values → `400 Bad Request` (match existing DTO style).

### Role access

| Role | Access | Response shape |
|------|--------|----------------|
| `SUPER_ADMIN` | Allowed when `organizationId` set (tenant context) | Full operational map for that org only |
| `SUPER_ADMIN` (no org) | **403** or empty with message — **no cross-tenant platform map** in Phase 4 |
| `TENANT_ADMIN` | Full map for own org | Full response |
| `ADMIN` | Full map for own org | Full response |
| `SECURITY` | Operational map for own org | Full slot/event summary; **no revenue**, **no user PII** (mask vehicle owner) |
| `USER` | **Availability map** for own org | Status + type + slot/floor labels; **no** admin-only fields; booking/event summary reduced to "Reserved"/"Occupied" labels only |

Cross-tenant lot id → `404 Not Found` (match existing parking-lot style, not 403 with data leak).

### Response 200

```json
{
  "parkingLot": {
    "id": 1,
    "name": "Lot A",
    "isActive": true
  },
  "floors": [
    {
      "id": 10,
      "name": "Ground",
      "level": 0,
      "slotCount": 24
    }
  ],
  "selectedFloorId": 10,
  "groups": [
    {
      "floorId": 10,
      "floorName": "Ground",
      "level": 0,
      "slots": [
        {
          "id": 101,
          "slotNumber": "A-01",
          "slotType": "CAR",
          "status": "OCCUPIED",
          "displayLabel": "A-01",
          "floorId": 10,
          "floorName": "Ground",
          "floorLevel": 0,
          "isMaintenance": false,
          "occupancy": {
            "state": "OCCUPIED",
            "vehicleNumber": "TS09EA1234",
            "bookingCode": "BK-12345",
            "eventId": 55,
            "bookingId": 12,
            "checkedInAt": "2026-06-19T08:00:00.000Z"
          }
        }
      ]
    }
  ],
  "legend": {
    "AVAILABLE": 10,
    "RESERVED": 2,
    "OCCUPIED": 8,
    "MAINTENANCE": 1,
    "UNKNOWN": 0
  },
  "filters": {
    "floorId": 10,
    "status": null,
    "vehicleType": null
  },
  "lastUpdated": "2026-06-19T12:00:00.000Z"
}
```

### Field rules

| Field | Rule |
|-------|------|
| `occupancy` | Present only when slot has active booking or active parking event; derived from existing source of truth |
| `vehicleNumber` | SECURITY/ADMIN/TENANT_ADMIN only; **omitted for USER** |
| `bookingCode` | Operational roles only; USER sees `state` label only |
| `eventId` / `bookingId` | For deep links to existing detail routes |
| `isMaintenance` | `true` when `status === MAINTENANCE` |
| `UNKNOWN` count | Slots with unrecognized status (should be 0 in normal ops) |

### Empty / error behavior

| Case | Response |
|------|----------|
| Lot exists, no floors | `200` with `groups: []`, `floors: []` |
| Floor filter with no slots | `200` with empty `groups` for that floor |
| Inactive / wrong-tenant lot | `404` |
| USER forbidden lot | `403` per org rules |

### Implementation notes (4B)

- Reuse `ParkingLotValidationService.getActiveParkingLotOrThrow`
- Reuse `AccessPolicyService.buildSlotOrganizationWhere`
- Join active `ParkingEvent` (status ACTIVE) and/or `Booking` (CONFIRMED, not expired) for occupancy summary
- Do **not** expose `passwordHash`, payment amounts, or full user records
- `lastUpdated` = server timestamp at query time (poll-friendly for SECURITY; no WebSocket)

---

## Frontend contract

### Route

```
/parking-lots/:parkingLotId/slot-map
```

**Guards:** `ProtectedRoute` + `RoleRoute`  
**Allowed roles:** `TENANT_ADMIN`, `ADMIN`, `SECURITY`, `USER` (USER gets sanitized API response)

Entry points:

- **Parking lot details** — "Visual map" / "Map" tab or header action
- **Sidebar** — optional later; primary entry from lot details + dashboard drill-down
- **Dashboard donut** — may deep-link to slot-map with `?status=` (optional 4D polish)

### Page structure

```text
VisualSlotMapPage
├── PageHeader ("Visual Slot Map", lot name subtitle)
├── Toolbar
│   ├── Parking lot selector (if user can access multiple lots)
│   ├── Floor tabs or Select
│   ├── Status filter (Select)
│   ├── Vehicle type filter (Select)
│   └── Slot number search (SearchField)
├── SlotMapLegend (counts from API legend)
├── SlotMapGrid (scrollable)
│   └── SlotMapCard × N (button, selected state, status chip, type icon)
└── SlotDetailDrawer (MUI Drawer or Dialog)
    ├── slot number, floor, type, status
    ├── occupancy summary (role-safe)
    └── links: booking detail, parking event detail (if routes exist)
```

### Components (new, 4C)

| Component | Path |
|-----------|------|
| `VisualSlotMapPage` | `frontend/src/pages/parking-lots/VisualSlotMapPage.tsx` |
| `SlotMapGrid` | `frontend/src/components/slot-map/SlotMapGrid.tsx` |
| `SlotMapCard` | `frontend/src/components/slot-map/SlotMapCard.tsx` |
| `SlotMapLegend` | `frontend/src/components/slot-map/SlotMapLegend.tsx` |
| `SlotDetailDrawer` | `frontend/src/components/slot-map/SlotDetailDrawer.tsx` |
| `slotMapApi` | `frontend/src/api/slotMapApi.ts` |
| Types | `frontend/src/types/slotMap.ts` |

### Design rules

- MUI 7 + existing theme tokens only
- Reuse `SlotStatusChip`, `getStatusStyle`, `SearchField`, `PageHeader`, `EmptyState`
- No full-page DataGrid on map view
- Selected slot: border/elevation from theme `primary`
- Laptop (1366–1536px): legend + filters + first row of slots visible above fold where practical
- Dark/light mode via theme (no hardcoded hex on cards)

### Deep links (existing app)

| Target | Route |
|--------|-------|
| Booking detail | `/bookings` + dialog or `/bookings/:id` if exists |
| Parking event | `/parking-events` + detail dialog |
| Admin slots table | `/parking-lots/:id/slots` |

---

## PR stack (Phase 4 loops)

| Loop | Branch | Deliverable |
|------|--------|-------------|
| **4A** | `docs/phase-4-visual-slot-map-contract` | This contract |
| **4B** | `feature/phase-4b-slot-map-api` | Backend API + tests |
| **4C** | `feature/phase-4c-visual-slot-map-ui` | Frontend UI + tests |
| **4D** | `test/phase-4-visual-slot-map-acceptance` | Acceptance + Cypress smoke if stable |

---

## Acceptance criteria (4D)

### Backend

- [ ] TENANT_ADMIN/ADMIN fetch own-org lot map
- [ ] SECURITY fetch operational map without revenue/PII
- [ ] USER gets safe availability map or controlled 403 per contract
- [ ] Cross-tenant access blocked (404)
- [ ] `floorId`, `status`, `vehicleType` filters work
- [ ] Active booking/event summary appears safely
- [ ] Empty lot/floor returns controlled 200

### Frontend

- [ ] Page renders map from API
- [ ] Floor + status + type filters work
- [ ] Legend renders with counts
- [ ] Slot cards show status labels (not color alone)
- [ ] Click slot opens detail drawer
- [ ] Loading, empty, error states polished
- [ ] Role guards safe; app shell + branding intact

### Cypress (optional, deterministic)

- [ ] Admin login → open slot map → select floor → click slot → drawer visible

### Tenant isolation

- [ ] Tenant A cannot see Tenant B map data

---

## Known deferred work

- WebSocket / live occupancy push
- IoT / sensor integration
- Camera / ANPR
- Mobile security gate (Phase 5)
- Advanced floor-plan editor / map image upload
- Platform-wide SUPER_ADMIN multi-tenant map console

## Next phase after 4D

**Phase 5 — Mobile Security Gate** (do not start until human approves).