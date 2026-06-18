# Cypress Journey Registry

> **Owner:** E2E rollout (LOOP 01)  
> **Smoke location:** `frontend/cypress/e2e/smoke/`  
> **Update rule:** Any sellable journey change must update this registry and corresponding smoke in the same PR.

## Priority legend

| Priority | Meaning |
|----------|---------|
| P0 | PR-gate smoke — must pass before merge once E2E CI is required |
| P1 | Important sellable flow — add in rollout or next sprint |
| P2 | Admin/deep flows — smoke or separate regression repo |

## Smoke status legend

| Status | Meaning |
|--------|---------|
| `planned` | Documented, no spec yet |
| `implemented` | Spec exists in monorepo smoke |
| `deferred` | Intentionally postponed with reason |
| `separate-repo` | Full regression only in future `smart-parking-e2e` |

---

## J1 — Login → role home redirect

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Roles** | ADMIN, SECURITY, USER |
| **Route** | `/login` → `/admin/dashboard`, `/security/dashboard`, or `/user/dashboard` |
| **Spec** | `auth-login.cy.ts` |
| **Status** | `planned` (E2E 02) |

**User story:** As any role, I log in with email/password and land on my role-specific dashboard.

**Preconditions:** Registered user exists for target role (register via API or use test fixture).

**Happy path:**
1. Visit `/login`
2. Enter email and password
3. Submit form
4. Assert URL matches `getRoleHomePath(role)`
5. Assert authenticated layout/nav visible

**Assertions:** Dashboard heading or nav item for role; no login form visible.

**Deferred:** Invalid credentials, locked account, tenant branding — Vitest + backend auth tests.

**Classification:** Monorepo smoke (PR gate).

---

## J2 — Register → correct dashboard

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Roles** | USER (primary), ADMIN |
| **Route** | `/register` → role home |
| **Spec** | `auth-register.cy.ts` |
| **Status** | `planned` (post E2E 02) |

**User story:** As a new user, I register and am redirected to the correct dashboard for my role.

**Preconditions:** Unique email (timestamp-based).

**Happy path:**
1. Visit `/register`
2. Fill name, email, phone, password, role
3. Submit
4. Assert redirect to role home path

**Assertions:** User sees dashboard; can access role-allowed nav.

**Deferred:** Duplicate email validation, SUPER_ADMIN registration — backend tests.

**Classification:** Monorepo smoke (P1 — add after J1/J14 stable).

---

## J3 — Register vehicle → appears in list

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Roles** | USER, ADMIN |
| **Route** | `/vehicles` |
| **Spec** | `vehicles.cy.ts` |
| **Status** | `planned` (E2E 02) |

**User story:** As a user, I register a vehicle and see it in my vehicles table.

**Preconditions:** Logged in as USER; `cy.uniquePlate()` for plate number.

**Happy path:**
1. Login as USER
2. Navigate to `/vehicles`
3. Open create vehicle form/dialog
4. Enter plate, type, brand, model, color
5. Save
6. Assert vehicle plate visible in grid/list

**Assertions:** Business columns visible (Vehicle Number, Type); no raw `vehicleId` in main table.

**Deferred:** Edit/delete vehicle, duplicate plate — Vitest + API tests.

**Classification:** Monorepo smoke.

---

## J4 — Book slot → booking visible

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Roles** | USER |
| **Route** | `/bookings` |
| **Spec** | `booking-lifecycle.cy.ts` |
| **Status** | `planned` (E2E 03) |

**User story:** As a user, I book an available parking slot and see the booking in my list.

**Preconditions:** USER logged in; vehicle exists; parking lot with available slot (seed or API setup).

**Happy path:**
1. Login as USER
2. Navigate to `/bookings`
3. Create booking — select lot, slot, vehicle, time window
4. Submit
5. Assert booking row with Booking No/Code, lot name, slot, CONFIRMED status

**Assertions:** Booking visible; business labels not raw IDs.

**Deferred:** Cancel booking, expired booking, no slots available — Vitest/backend.

**Classification:** Monorepo smoke.

---

## J5 — Security/Admin check-in → active event

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Roles** | SECURITY, ADMIN |
| **Route** | `/bookings`, `/parking-events` |
| **Spec** | `security-checkin.cy.ts` |
| **Status** | `planned` (E2E 03) |

**User story:** As security staff, I check in a confirmed booking and see an active parking event.

**Preconditions:** CONFIRMED booking exists (from J4 chain or API seed).

**Happy path:**
1. Login as SECURITY
2. Navigate to `/bookings` or gate flow
3. Find booking by code or search
4. Perform check-in
5. Navigate to `/parking-events`
6. Assert ACTIVE event with Session No, vehicle, lot, slot

**Assertions:** Event status ACTIVE; check-in timestamp visible.

**Deferred:** Wrong booking code, already checked in — backend tests.

**Classification:** Monorepo smoke.

---

## J6 — Security/Admin check-out → completed event

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Roles** | SECURITY, ADMIN |
| **Route** | `/parking-events` |
| **Spec** | `security-checkout.cy.ts` |
| **Status** | `planned` (E2E 03) |

**User story:** As security staff, I check out an active session and the event completes with fee calculated.

**Preconditions:** ACTIVE parking event from J5.

**Happy path:**
1. Login as SECURITY
2. Navigate to `/parking-events`
3. Find ACTIVE session
4. Perform check-out
5. Assert COMPLETED status, duration/fee fields populated

**Assertions:** Event COMPLETED; slot released (optional API verify).

**Deferred:** Payment failure on checkout, long-duration fee edge cases — backend.

**Classification:** Monorepo smoke.

---

## J7 — User views parking/payment history

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Roles** | USER |
| **Route** | `/parking-events`, `/payments` |
| **Spec** | `user-history.cy.ts` |
| **Status** | `planned` |

**User story:** As a user, I view my own parking sessions and payment history without seeing other users' data.

**Preconditions:** USER with completed session and payment from J4–J6 chain.

**Happy path:**
1. Login as USER
2. Visit `/parking-events` — see own sessions only
3. Visit `/payments` — see own receipts

**Assertions:** Receipt No, Booking No labels; no other tenants' data.

**Deferred:** Empty state illustrations — Vitest.

**Classification:** Monorepo smoke (P1) or separate-repo deep regression.

---

## J8 — Payment initiation / Razorpay stub

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Roles** | USER |
| **Route** | `/payments` or checkout modal |
| **Spec** | `payment-initiation.cy.ts` |
| **Status** | `planned` (E2E 03) |

**User story:** As a user, I initiate payment after checkout and see payment status update without real Razorpay.

**Preconditions:** COMPLETED event with INITIATED payment (from J6).

**Happy path:**
1. Login as USER
2. Navigate to payments or post-checkout flow
3. Stub `POST **/payments/**` and/or `window.Razorpay`
4. Trigger pay/initiate action
5. Assert payment row shows INITIATED or appropriate status UI

**Assertions:** No real Razorpay network call in CI; receipt/payment reference visible.

**Deferred:** Webhook completion, verify signature — payment-service tests.

**Classification:** Monorepo smoke with stubs only.

---

## J9 — Admin creates parking lot

| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Roles** | ADMIN |
| **Route** | `/parking-lots` |
| **Spec** | `admin-lot.cy.ts` |
| **Status** | `planned` |

**User story:** As an admin, I create a parking lot and see it in the lots table.

**Preconditions:** ADMIN logged in.

**Happy path:** Create lot with name, address, city → row visible in grid.

**Deferred:** Soft delete, edit lot — API tests.

**Classification:** P2 smoke or separate-repo.

---

## J10 — Admin manages floors/slots

| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Roles** | ADMIN |
| **Route** | `/parking-lots/:id`, `/parking-lots/:id/floors`, `/parking-lots/:id/slots` |
| **Spec** | `admin-floors-slots.cy.ts` |
| **Status** | `planned` |

**User story:** As an admin, I add floors and slots to a lot and see counts update.

**Preconditions:** Parking lot exists.

**Happy path:** Add floor → bulk create slots → verify slot grid.

**Deferred:** Slot status transitions — covered by J4–J6.

**Classification:** P2 or separate-repo.

---

## J11 — Admin views bookings/payments grids

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Roles** | ADMIN |
| **Route** | `/bookings`, `/payments` |
| **Spec** | `admin-grids.cy.ts` |
| **Status** | `planned` |

**User story:** As an admin, I view all tenant bookings and payments with readable business columns.

**Preconditions:** Seed data with bookings and payments.

**Happy path:** Login ADMIN → visit grids → assert columns load, search works.

**Regression:** No `GET **/parking-lots/*/slots**` fan-out on initial Bookings/Parking Events load (see `api-fanout-regression.cy.ts`).

**Classification:** Monorepo smoke (P1) + fan-out regression in E2E 03.

---

## J12 — Admin mock payment success/fail

| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Roles** | ADMIN |
| **Route** | `/payments` |
| **Spec** | `admin-mock-payment.cy.ts` |
| **Status** | `planned` |

**User story:** As an admin, I trigger mock payment success/failure for demo/support.

**Preconditions:** Payment in INITIATED state.

**Happy path:** Mock success → SUCCESS status; mock fail → FAILED status.

**Deferred:** Production gating of mock UI — product decision.

**Classification:** P2 smoke or dev-only; not PR CI if mock is dev-gated.

---

## J13 — Admin dashboard summary loads

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Roles** | ADMIN |
| **Route** | `/admin/dashboard` |
| **Spec** | `admin-dashboard.cy.ts` |
| **Status** | `planned` |

**User story:** As an admin, I open the dashboard and see summary metrics/cards load without error.

**Preconditions:** ADMIN logged in; optional seed metrics.

**Happy path:** Visit `/admin/dashboard` → assert key widgets render.

**Classification:** Monorepo smoke (P1).

---

## J14 — Unauthorized route blocked / logout

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Roles** | ALL |
| **Route** | Protected routes, `/login` |
| **Spec** | `auth-guard.cy.ts` |
| **Status** | `planned` (E2E 02) |

**User story:** Unauthenticated users cannot access protected pages; users cannot access wrong-role routes; logout clears session.

**Preconditions:** None for unauth test; USER account for role mismatch.

**Happy path:**
1. Visit `/bookings` without auth → redirect `/login`
2. Login as USER → visit `/admin/dashboard` → blocked or redirect with message
3. Logout → visit `/bookings` → redirect `/login`

**Assertions:** Protected content not visible after logout.

**Deferred:** Token expiry refresh — Vitest AuthProvider tests.

**Classification:** Monorepo smoke.

---

## Regression: API fan-out guard

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Spec** | `api-fanout-regression.cy.ts` |
| **Status** | `planned` (E2E 03) |

**Rule:** Initial load of Bookings and Parking Events pages must **not** call `GET **/parking-lots/*/slots**`.

**Reason:** Phase 1b enriched APIs; broad slots fan-out is a performance regression.

---

## Rollout mapping

| Loop | Journeys |
|------|----------|
| E2E 02 | J1, J3, J14 |
| E2E 03 | J4, J5, J6, J8 + fan-out regression |
| Post-rollout | J2, J7, J11, J13 (P1) |
| Future / separate repo | J9, J10, J12 (P2) |

## Seed / test data notes

```text
- Use timestamp-based unique emails/plates in Cypress (cy.uniquePlate, cy.uniqueEmail)
- Register users via UI or POST /api/auth/register when needed
- Document known dev credentials in cypress reports — never commit production secrets
- Default org from prisma seed: organization id=1 slug=default
- Full parking lifecycle may require API helpers in cypress/support/commands.ts (E2E 03)
```