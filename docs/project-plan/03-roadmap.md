# Roadmap

Phased plan from current single-tenant app to sellable multi-tenant SaaS.

---

## Phase 0 — Foundation (done / in progress)

| Item | Status |
|------|--------|
| NestJS API + Prisma schema | Done |
| React + MUI frontend | Done |
| Role-based UI (ADMIN, SECURITY, USER) | Done |
| Bookings, parking events, slot lifecycle | Done |
| Razorpay payment integration | In progress (phase 8) |
| Shared UI components (DataGrid, StatusChip, EmptyState, etc.) | Done |
| Free design assets (Inter font, unDraw illustrations) | Done |

---

## Phase 1 — Multi-tenancy core

**Goal:** One deployment serves many customers with isolated data.

- [ ] Add `Organization` model to Prisma schema
- [ ] Add `organizationId` to tenant-scoped tables
- [ ] Migration strategy for existing seed data (default org)
- [ ] JWT claims: `organizationId`, expanded `Role` enum
- [ ] NestJS tenant guard / Prisma middleware for automatic scoping
- [ ] SUPER_ADMIN and TENANT_ADMIN roles
- [ ] Tenant onboarding API (create org + first admin user)
- [ ] Frontend: tenant context in auth provider

**Exit criteria:** Two orgs in DB see completely separate parking lots and users.

---

## Phase 2 — White-label and tenant admin

**Goal:** Each customer sees their brand, not ours.

- [ ] Per-tenant logo, name, primary color in DB
- [ ] Dynamic MUI theme from tenant settings
- [ ] Login page and sidebar use tenant branding
- [ ] TENANT_ADMIN settings screen (branding + profile)
- [ ] Optional custom subdomain slug

**Exit criteria:** Two tenants look like two different products in the UI.

---

## Phase 3 — Operator dashboard

**Goal:** Sellable analytics for lot operators.

- [ ] Occupancy % (available / occupied / reserved per lot)
- [ ] Active sessions count
- [ ] Revenue today / this week / this month
- [ ] Slot heatmap by floor (use `heatmap` illustration + real data grid)
- [ ] Role-specific dashboards (tenant admin vs lot admin)

**Exit criteria:** Admin opens dashboard and understands lot health in 5 seconds.

---

## Phase 4 — Visual slot map

**Goal:** #1 demo feature for sales calls.

- [ ] Floor plan grid: slots as colored cells by status
- [ ] Click slot → details drawer (vehicle, booking, duration)
- [ ] Filter by vehicle type (CAR, BIKE, EV, HANDICAPPED)
- [ ] Real-time or polling refresh for SECURITY view

**Exit criteria:** Guard or admin sees entire floor occupancy visually without reading a table.

---

## Phase 5 — Mobile security gate

**Goal:** Fast operations at the gate on a phone.

- [ ] Dedicated `/security/gate` mobile layout
- [ ] Large touch targets for check-in / check-out
- [ ] Search by booking code or vehicle number
- [ ] QR scan hook (future: camera API)

**Exit criteria:** Check-in flow completable one-handed on a 375px-wide screen.

---

## Phase 6 — Subscription and billing

**Goal:** Monetize the platform.

- [ ] Plan model (STARTER, PRO, ENTERPRISE)
- [ ] Enforce lot and user limits per plan
- [ ] Feature flags per plan (heatmap, slot map, exports)
- [ ] Platform billing integration (Razorpay Subscriptions or Stripe)
- [ ] SUPER_ADMIN tenant management UI

**Exit criteria:** New tenant signup respects plan limits without manual intervention.

---

## Phase 7 — Enterprise and integrations

**Goal:** Win hospital, mall, and commercial operator deals.

- [ ] Multi-site operator console (many lots, one tenant)
- [ ] Export / reports (CSV, PDF receipts)
- [ ] Webhook events for external systems
- [ ] Gate / barrier hardware API (future)
- [ ] SSO / SAML for enterprise tenants (future)

---

## Suggested build order

```text
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

Phases 3 and 4 can overlap after Phase 1 is stable. Phase 5 can start once parking events API is tenant-scoped.