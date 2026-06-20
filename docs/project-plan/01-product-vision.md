# Product Vision

## What we are building

A **multi-tenant Smart Parking SaaS platform** sold to operators who manage parking at:

- Apartments and residential complexes
- Hospitals
- Malls and retail centers
- Office campuses
- Public parking lots
- Commercial multi-site parking operators

This is a **sellable SaaS product**, not a portfolio demo or single-deployment app.

## Layer model

```text
Platform (us)      → Billing, platform analytics, tenant lifecycle
Tenant (customer)  → Apartment / hospital / mall / office / public lot operator
End users          → Residents, staff, visitors, security guards
```

## SaaS priorities (high)

1. **Multi-tenancy** — every record scoped to a tenant/organization
2. **White-label UI** — per-tenant logo, name, and theme colors
3. **Role hierarchy** — TENANT_ADMIN, ADMIN, SECURITY, USER
4. **Operator dashboards** — occupancy, revenue, active sessions, heatmaps
5. **Visual slot maps** — floor-plan grid view (key sales differentiator)
6. **Mobile-first security gate** — fast check-in / check-out for guards
7. **Subscription-ready** — lot limits, user limits, feature flags per plan

## Target customer profiles

### Apartment

- Resident parking assignments
- Visitor passes and temporary slots
- Admin manages floors, slots, and resident vehicles

### Hospital

- Staff vs visitor zones
- EV and handicapped slot types
- 24/7 security operations

### Mall

- High turnover, payment at exit
- Occupancy analytics and peak-hour insights

### Office

- Employee reservations
- Visitor management and guest parking

### Public lot

- Pay-per-use sessions
- Dynamic pricing potential
- Gate / barrier integration (future)

### Commercial operator

- One console for many parking sites
- Cross-site reporting and billing

## Success criteria for v1 SaaS

- A new tenant can be onboarded without code changes
- Data is fully isolated between tenants
- Each tenant sees only their branding and their lots
- An operator can understand occupancy and revenue at a glance
- Security staff can check in/out on a phone-sized screen in under 10 seconds