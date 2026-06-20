# Gap Analysis — Current State vs. SaaS Target

Snapshot as of 2026-06-17.

## What exists today

### Backend (`backend/`)

- NestJS + Prisma + MySQL
- Models: User, ParkingLot, Floor, Slot, Vehicle, Booking, ParkingEvent, SlotAssignment, Payment
- `ParkingLotType` enum: APARTMENT, MALL, HOSPITAL, OFFICE, PUBLIC
- Roles: ADMIN, SECURITY, USER
- Slot lifecycle service, parking events, bookings
- Razorpay integration (in progress on feature branch)

### Frontend (`frontend/`)

- React + Vite + MUI + React Query
- Role-based navigation and pages
- Shared components: AppDataGrid, StatusChip, EmptyState, DetailsDrawer, etc.
- Razorpay checkout UI
- Light theme with Inter font and illustration assets

### Payment service (`payment-service/`)

- Spring Boot microservice
- Razorpay initiate, verify, webhook handlers

## Critical gaps for sellable SaaS

| Gap | Impact | Roadmap phase |
|-----|--------|---------------|
| No `Organization` / tenant model | Cannot sell to multiple customers on one deployment | Phase 1 |
| No `organizationId` on data | No data isolation | Phase 1 |
| No TENANT_ADMIN | No tenant self-service or org management | Phase 1 |
| Single global branding | Product looks like one app, not white-label | Phase 2 |
| Basic dashboards only | Weak sales demo for operators | Phase 3 |
| Table-only slot view | Missing visual occupancy (competitor disadvantage) | Phase 4 |
| Desktop-first security UI | Poor gate experience on mobile | Phase 5 |
| No subscription / plan limits | Cannot monetize as SaaS | Phase 6 |

## Schema note

`backend/prisma/schema.prisma` has **no tenant fields**. A search for `tenant`, `organization`, or `orgId` returns no matches.

`ParkingLotType` describes **what kind of lot** it is (apartment, mall, etc.), not **which customer organization** owns it. Both concepts are needed:

```text
Organization  → the SaaS customer (e.g. "Sunrise Apartments Pvt Ltd")
ParkingLot    → a physical site under that org
ParkingLot.type → APARTMENT | MALL | HOSPITAL | OFFICE | PUBLIC
```

## What is already aligned with SaaS direction

- `ParkingLotType` maps to target verticals
- Role separation (admin / security / user) maps to real operations
- Payment flow (book → check-in → check-out → pay) is correct for commercial use
- UI standards in `.grok/AGENTS.md` favor business-friendly, sellable presentation
- MUI stack supports white-label theming without a framework change

## Next recommended step

**Start Phase 1: Multi-tenancy core** — add Organization model and scope all queries before building more features on single-tenant assumptions.