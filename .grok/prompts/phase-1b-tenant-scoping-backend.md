# Phase 1b — Backend Tenant Scoping Enforcement

Read `.grok/AGENTS.md` first and strictly follow all coding standards, architecture rules, branch rules, testing rules, and reporting rules defined there.

If anything in this prompt conflicts with `.grok/AGENTS.md`, follow `.grok/AGENTS.md` unless the human explicitly overrides it.

Execute Phase 1b only: Backend Tenant Scoping Enforcement.

Repository:
`https://github.com/imkpk/smart-parking-system`

Base branch:
`develop`

Important prerequisite:
PR #40 and PR #41 must already be merged into `develop`.

Before coding:

```bash id="mg3wqp"
git checkout develop
git pull origin develop
```

Create branch:

```bash id="up6g5e"
git checkout -b feature/phase-1b-tenant-scoping-backend
```

This is a real enterprise Smart Parking SaaS product, not a demo app. The goal is to make the backend SaaS-safe so one customer organization cannot see or operate on another customer organization’s data.

Do not change frontend.
Do not change payment-service.
Do not build tenant onboarding API.
Do not build white-label UI.
Do not build subscription billing.
Do not build dashboards beyond tenant-safe filtering if existing dashboard queries need it.
Do not add visual slot map work.
Do not add mobile security gate UI.
Do not merge the PR.
Do not start Phase 1c/1d frontend/onboarding work.
Do not create large unrelated refactors.

Goal:
Turn the Phase 1a `organizationId` schema foundation into enforced backend tenant scoping.

Phase 1a already added direct `organizationId` to:

```text id="tkodct"
User
ParkingLot
Vehicle
Booking
ParkingEvent
SlotAssignment
```

Phase 1a did not add direct `organizationId` to:

```text id="fxnzcf"
Floor
Slot
```

For Phase 1b, Floor and Slot should inherit tenant context through:

```text id="iu0maf"
Slot → Floor → ParkingLot → organizationId
```

Prefer relation-based filtering for Floor/Slot unless a direct column is clearly necessary. If adding direct `organizationId` to Floor/Slot becomes necessary, stop and explain why before making a larger schema change.

Read first:

```text id="ua372q"
MASTER_PROMPT.md
.grok/AGENTS.md
.grok/reports/phase-1a-organization-schema.md
.grok/review/pr40review.md
docs/project-plan/02-architecture.md
docs/project-plan/03-roadmap.md
docs/project-plan/05-gap-analysis.md
docs/project-plan/07-hld-saas-v2.md
docs/project-plan/09-branch-strategy.md
backend/prisma/schema.prisma
```

Inspect backend areas:

```text id="18yg13"
backend/src/auth
backend/src/users
backend/src/access-policy
backend/src/vehicles
backend/src/bookings
backend/src/parking-lots
backend/src/parking-events
backend/src/dashboard
backend/src/integrations/payment-service
backend/src/test
```

Core requirements:

## 1. JWT / authenticated user organization context

Existing login must continue to work with email/password only.

For Phase 1b:

* Include `organizationId` in JWT payload for users that have one.
* Preserve existing JWT fields: `sub`, `email`, `role`.
* Preserve current frontend-compatible auth response shape.
* Do not require tenant slug/subdomain at login yet.
* Default organization behavior from Phase 1a must continue.
* Existing ADMIN, SECURITY, USER logins must still work.

Expected JWT payload shape:

```ts id="a0cuqx"
{
  sub: user.id,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId
}
```

If there is an existing JWT payload type/interface, update it safely.

If request user typing exists, update it so services can reliably access:

```text id="m3yh6t"
id
email
role
organizationId
```

## 2. Tenant access policy

Extend or reuse `AccessPolicyService`.

Required behavior:

* `USER` can access only their own records and only inside their organization.
* `ADMIN` can access records inside their organization.
* `SECURITY` can access operational records inside their organization.
* `SUPER_ADMIN` and `TENANT_ADMIN` were added in Phase 1a, but do not implement a full platform console or onboarding behavior in this PR.
* If minimal role checks are needed for compile safety, keep them conservative and documented.
* Do not loosen any existing permission.

Add clear helper methods if useful, for example:

```ts id="tnxkhm"
assertSameOrganization(currentUser, recordOrganizationId)
canAccessOrganization(currentUser, organizationId)
getRequiredOrganizationId(currentUser)
```

Do not duplicate tenant-check logic across every service if a shared helper already exists.

## 3. Query scoping

Every tenant-owned read/list/query must be scoped by organization.

Update service-level Prisma queries for:

```text id="6r4vu3"
Parking lots
Floors
Slots
Vehicles
Bookings
Parking events
Slot assignments if used
Dashboard/report queries if they read tenant-owned data
```

Important:
Do not rely only on controllers. Enforce scoping inside services/access policy so future endpoints remain safer.

Examples:

ParkingLot queries:

```ts id="7w7e25"
where: {
  organizationId: currentUser.organizationId,
  ...
}
```

Floor queries should scope through ParkingLot:

```ts id="rgz9xh"
where: {
  parkingLot: {
    organizationId: currentUser.organizationId,
  },
  ...
}
```

Slot queries should scope through Floor → ParkingLot:

```ts id="t2dhv2"
where: {
  floor: {
    parkingLot: {
      organizationId: currentUser.organizationId,
    },
  },
  ...
}
```

Booking queries:

```ts id="o5k6fl"
where: {
  organizationId: currentUser.organizationId,
  ...
}
```

ParkingEvent queries:

```ts id="5q93n5"
where: {
  organizationId: currentUser.organizationId,
  ...
}
```

Vehicle queries:

```ts id="x1zj1p"
where: {
  organizationId: currentUser.organizationId,
  ...
}
```

## 4. Cross-tenant write protection

Prevent cross-organization writes.

Check these flows carefully:

```text id="f7frv8"
create vehicle
create booking
check-in
check-out
parking lot create/update/read/delete
floor create/update/read/delete
slot create/update/read/delete
dashboard reads
```

Booking creation must ensure:

* current user has organizationId
* vehicle belongs to same organization
* slot belongs to a floor/parking lot in same organization
* booking organizationId comes from current user / validated lot context
* user cannot book using another organization’s vehicle or slot

Check-in must ensure:

* booking belongs to current user/org according to role rules
* generated ParkingEvent keeps same organizationId
* security/admin cannot check in another organization’s booking

Check-out must ensure:

* parking event belongs to current organization
* payment initiation behavior remains unchanged
* no payment-service contract changes

Parking lot/floor/slot management must ensure:

* ADMIN cannot update/delete another org’s lot/floor/slot
* SECURITY/USER permissions remain as before, only safer by org

## 5. Existing behavior must remain

Do not break these existing flows:

```text id="07h1n0"
ADMIN login
USER login
SECURITY login
vehicle registration
booking creation
check-in
check-out
slot lifecycle reserve/occupy/release
Razorpay payment initiation/verification/webhook contract
frontend auth response
```

## 6. Tests required

Add or update backend tests proving tenant isolation.

At minimum:

### Auth tests

* Login JWT includes `organizationId`.
* Existing ADMIN login still works.
* Existing USER login still works.
* Login does not require tenant slug in Phase 1b.

### Vehicle tests

* User can create/list own org vehicles.
* User/admin cannot access another org’s vehicle.
* Duplicate vehicle number is allowed across different orgs only if existing schema supports it.
* Duplicate vehicle number inside same org is rejected.

### Booking tests

* User cannot create booking with another org’s vehicle.
* User cannot create booking with another org’s slot.
* Booking gets correct `organizationId`.
* Admin/security cannot operate across organizations.

### Parking event tests

* Check-in copies `organizationId` from booking.
* Check-in rejects another org’s booking.
* Check-out rejects another org’s active parking event.
* Existing payment initiation behavior remains unchanged.

### Parking lot/floor/slot tests

* Parking lot list/read/update/delete scoped to org.
* Floor access scoped through parking lot organization.
* Slot access scoped through floor → parking lot organization.

### Dashboard tests if dashboard reads tenant-owned data

* Dashboard aggregates only current organization data.

Use test fixtures for at least:

```text id="89fixi"
DEFAULT_ORGANIZATION_ID = 1
OTHER_ORGANIZATION_ID = 2
admin in org 1
user in org 1
security in org 1
user/admin/security in org 2
lot/floor/slot in org 1
lot/floor/slot in org 2
vehicle in org 1
vehicle in org 2
booking in org 1
booking in org 2
parking event in org 1
parking event in org 2
```

## 7. Middleware caution

Do not add broad Prisma middleware unless it is simple, testable, and cannot accidentally break auth, seed, migrations, or admin/platform behavior.

Prefer explicit service-level scoping plus shared access-policy helpers for this phase.

If you believe Prisma middleware is necessary, document why in the report and keep it minimal.

## 8. Documentation

Create report:

```text id="n46s7z"
.grok/reports/phase-1b-tenant-scoping-backend.md
```

Report must include:

```text id="khhp30"
1. Scope
2. Files changed
3. JWT/auth changes
4. Access policy changes
5. Services scoped
6. Floor/Slot tenant strategy
7. Cross-tenant protections added
8. Tests added/updated
9. Build/test results
10. What is intentionally deferred
11. Manual smoke test steps
12. Next phase
```

Update:

```text id="1l2yfk"
.grok/reports/README.md
```

Update `MASTER_PROMPT.md` minimally:

* Mark Phase 1a complete.
* Mark Phase 1b in progress/open PR.
* Keep current branch as `develop` unless the project convention says otherwise.
* Add changelog entry.
* Set next after Phase 1b as tenant onboarding API or frontend tenant context only if that matches roadmap.

Do not rewrite unrelated sections.

## 9. Validation commands

Run:

```bash id="rlxr2e"
cd backend
npx prisma validate
npx prisma generate
npm run build
npm run test:cov
```

If any frontend types break due to auth response typing, stop and report before changing frontend.

If backend-only changes do not affect frontend, no frontend build is required, but CI may still run it.

## 10. Manual smoke test checklist

Document expected manual test steps:

```text id="3glh6j"
1. Apply migrations on local DB
2. Run prisma seed
3. Login as ADMIN default org
4. Login as USER default org
5. Create vehicle
6. Create booking
7. Check-in
8. Check-out
9. Confirm org 1 user cannot access org 2 records
10. Confirm org 2 records do not appear in org 1 lists
```

## 11. Commit and PR

Commit:

```bash id="3kch6s"
git status
git add .
git commit -m "feat(backend): enforce tenant scoping"
git push -u origin feature/phase-1b-tenant-scoping-backend
```

Open PR to `develop`.

PR title:

```text id="h1t9qk"
feat(backend): enforce tenant scoping
```

PR body:

```markdown id="dc1lkl"
## Summary
- Added backend tenant scoping enforcement using organizationId.
- Added organizationId to JWT payload while preserving existing login behavior.
- Scoped tenant-owned service queries by organization.
- Added cross-tenant write protections.
- Added tests for tenant isolation.

## Phase
Phase 1b — backend tenant scoping enforcement

## Validation
- [ ] cd backend && npx prisma validate
- [ ] cd backend && npx prisma generate
- [ ] cd backend && npm run build
- [ ] cd backend && npm run test:cov

## Not included
- No frontend tenant context
- No tenant onboarding API
- No white-label UI
- No subscription billing
- No payment-service changes
- No Phase 2 dashboard/visual slot map work

## Manual smoke
- [ ] ADMIN login works
- [ ] USER login works
- [ ] Vehicle create works
- [ ] Booking create works
- [ ] Check-in works
- [ ] Check-out works
- [ ] Org 1 cannot access Org 2 data

## Next
Phase 1c / 1d depending on roadmap: tenant onboarding API and frontend tenant context.
```

Do not merge the PR.

Success criteria:

* Existing app flows still work.
* Auth token includes organizationId.
* Tenant-owned list/read/write operations are organization-scoped.
* Cross-tenant vehicle/slot/booking/event access is rejected.
* Floor and Slot scoping is handled safely through ParkingLot unless a direct column is intentionally added and documented.
* Backend build passes.
* Backend tests pass.
* PR stays focused on backend tenant enforcement only.
