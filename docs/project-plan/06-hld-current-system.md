# HLD — Current System (v1 — Archived)

> **Superseded by** [07-hld-saas-v2.md](./07-hld-saas-v2.md) and [diagrams/hld-saas-v2.svg](./diagrams/hld-saas-v2.svg).  
> Keep this doc as historical reference for the original plan.

Reference diagram: [diagrams/hld-current-system.jpg](./diagrams/hld-current-system.jpg)

This document captures the existing High Level System Design and how it maps to the codebase today.

## Diagram summary

**Title:** Smart Parking System — High Level System Design  
**Stack:** React Frontend + NestJS Main API + Spring Boot Payment Service

## Actors

| Actor | Access |
|-------|--------|
| Admin | Full management, dashboards, reports |
| Security | Check-in / check-out, active events |
| User | Vehicles, bookings, own history |

## Frontend (React + TypeScript + Vite)

- Role-based UI
- Admin Dashboard
- Parking Lots / Floors / Slots
- Vehicles, Bookings, Parking Events, Payments
- Talks to Main Backend via **REST APIs**

## Main Backend (NestJS + Prisma)

| Module | Responsibility |
|--------|----------------|
| Auth & RBAC | JWT, guards, DTO validation |
| Parking Lots / Floors / Slots | Lot structure and slot status |
| Vehicles | User vehicle registry |
| Bookings | Slot reservation |
| Parking Events | Check-in / check-out sessions |
| Dashboard / Reports | Admin analytics |

- **ORM:** Prisma → MySQL `parking_lot_db`
- **Entities:** Users, ParkingLots, Floors, Slots, Vehicles, Bookings, ParkingEvents

## Payment Service (Spring Boot)

| Capability | Notes |
|------------|-------|
| Initiate Payment | Called from NestJS at checkout |
| Mock Success / Failure | Dev / demo flows |
| Payment History | Per-user and admin views |
| Reports Summary | Revenue summaries |

- **ORM:** JPA / Repository → MySQL `parking_payment_db`
- **Entities:** Payments, Payment Status, Provider Reference
- **Integration:** HTTP call from NestJS during checkout (Razorpay added on current branch)

## Core business flow (10 steps)

1. User registers / logs in
2. User registers vehicle
3. User books available slot
4. Security / Admin checks in vehicle
5. Parking event becomes **ACTIVE**
6. Security / Admin checks out vehicle
7. Fee is calculated
8. NestJS calls Payment Service
9. Payment created / updated
10. Admin views dashboard & reports

## Key rules (from HLD)

- **User:** Create vehicle, book slot, view own history
- **Security:** Check-in / check-out, view active events
- **Admin:** Full management + reports
- Booking **reserves** the slot
- Check-out **releases** the slot and **initiates payment**

## Alignment with codebase

| HLD component | Repo location | Status |
|---------------|---------------|--------|
| React frontend | `frontend/` | Implemented |
| NestJS main API | `backend/` | Implemented |
| Spring payment service | `payment-service/` | Implemented |
| Prisma + parking_lot_db | `backend/prisma/` | Implemented |
| parking_payment_db | `payment-service/` | Implemented |
| JWT Auth & RBAC | `backend/src/auth/` | Implemented |
| Slot lifecycle | `backend/src/slots/` | Implemented |
| Razorpay | `payment-service/` + frontend checkout | In progress |

## What the HLD does not yet cover (SaaS gap)

The diagram describes a **single-deployment parking system**. For the sellable multi-tenant SaaS vision, these layers are **not in the HLD** and need to be added:

```text
Platform layer     → SUPER_ADMIN, tenant onboarding, subscription billing
Tenant layer       → Organization, organizationId scoping, white-label branding
Visual slot map    → Floor-plan occupancy grid (sales differentiator)
Mobile gate UI     → Dedicated security check-in/out on small screens
```

See [02-architecture.md](./02-architecture.md) and [05-gap-analysis.md](./05-gap-analysis.md) for the SaaS extension plan.

## Recommended HLD v2 (future)

When updating the diagram, add:

1. **Organization / Tenant** box between Users and Main Backend
2. **Tenant scope** on all Main Backend modules
3. **Razorpay** as external provider on Payment Service
4. **Platform Admin** actor above Tenant Admin
5. Optional **Webhook** arrow from Razorpay → Payment Service