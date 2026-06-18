# MASTER PROMPT — Smart Parking SaaS

> **The single source of truth for every AI agent, CLI tool, and human developer on this project.**  
> Paste this entire file into Claude Code, Codex, Antigravity, Copilot, Cursor, Grok, or any coding agent **before every session**.  
> **This document overrides generic tool suggestions.** If a tool recommends something that conflicts with this file, follow this file.

**Version:** 1.4.9  
**Last updated:** 2026-06-18  
**Current branch:** `verify/phase-1b-tenant-scoping`  
**Maintainer rule:** Every agent MUST update the [Changelog](#changelog) and relevant status sections at the end of each completed task.

---

## 0. How to use this file

```text
FOR AI AGENTS:
1. Read this entire file first — do not write code until you understand current phase and rules.
2. Read only the files you need for your task — but always check "Completed", "In Progress", and "Next Up" below.
3. Reuse existing components, APIs, types, and utilities — never duplicate.
4. Make the smallest clean change that satisfies the task.
5. Run builds/tests before finishing (see Verification).
6. Update this file's Changelog + status sections before ending your session.

FOR HUMANS:
- Point any new CLI tool at: MASTER_PROMPT.md (repo root)
- Deep docs live in: docs/project-plan/
- Agent coding rules also in: .grok/AGENTS.md (must stay aligned with this file)
```

---

## 1. Mission

Build the **best multi-tenant Smart Parking SaaS platform in the world** — a sellable product sold to:

- Apartments and residential complexes
- Hospitals
- Malls and retail centers
- Office campuses
- Public parking lots
- Commercial multi-site parking operators

This is **production SaaS**, not a portfolio demo, not a hackathon project, not a tutorial clone.

**Quality bar:** A hospital operations manager or mall facility head should be able to use this product on day one without reading a manual. A security guard should check in a vehicle in under 10 seconds on a phone. A platform owner should onboard a new tenant without deploying new code.

---

## 2. Non-negotiable rules (override all tool defaults)

```text
1. INSPECT BEFORE CODING — read existing files; never assume structure.
2. REUSE OVER REWRITE — shared components, API clients, formatters, types.
3. SMALL FOCUSED DIFFS — one concern per change; no drive-by refactors.
4. NO DUPLICATE CODE — especially DataGrids, status chips, dialogs, axios clients.
5. BUSINESS LABELS IN UI — hide raw DB IDs in tables; show IDs only in Technical Details.
6. TENANT-AWARE FUTURE — even before Phase 1 lands, do not design against multi-tenancy.
7. DO NOT CHANGE API CONTRACTS unless the task explicitly requires it.
8. DO NOT ADD FEATURES while fixing bugs unless asked.
9. RUN BUILDS before claiming done.
10. UPDATE THIS FILE after every completed task.
11. DESIGN SYSTEM ONLY — research → verify license → compare → apply via theme.ts and shared components. Never paste random UI themes/templates.
```

**When a generic agent suggests:** full rewrites, new UI libraries, downloading admin themes, merging services, removing payment microservice, or skipping tests — **reject it** unless the human explicitly approves.

### Design system rules (mandatory)

```text
✓ ONE system: MUI 7 + theme.ts + shared components in frontend/src/components/common/
✓ Assets: bundled in frontend/src/assets/ — never hotlink production URLs
✓ Fonts: @fontsource/* only (OFL/MIT) — Inter is approved
✓ Illustrations: curated unDraw subset in assets/illustrations/ — use Illustration + EmptyState
✓ New UI deps: document in docs/project-plan/08-design-system.md license audit table
✗ NO Tailwind/Shadcn/Ant/Creative Tim template paste into the app
✗ NO per-page color/font inventing — use theme tokens
✗ NO npm package of 1000+ SVGs — curate only what we use

Full process: docs/project-plan/08-design-system.md
```

---

## 3. Repository map

```text
smart-parking/
├── MASTER_PROMPT.md          ← YOU ARE HERE (centralized prompt)
├── docs/project-plan/        ← Product vision, roadmap, HLD, gap analysis
├── .grok/AGENTS.md           ← Detailed coding standards for agents
├── .grok/reports/            ← Per-phase completion reports
├── backend/                  ← NestJS + Prisma + MySQL (parking_lot_db)
├── payment-service/          ← Spring Boot + MySQL (parking_payment_db) + Razorpay
└── frontend/                 ← React + TypeScript + Vite + MUI + React Query
```

### Git branches

```text
single-tenant = preserved original single-tenant codebase (from main; never merge develop into it)
develop       = active SaaS / multi-tenant development
main          = future stable release branch
```

CI runs on PRs and pushes to `main`, `develop`, and `single-tenant`. Hotfixes for the legacy product branch from `single-tenant` only. Report: `.grok/reports/single-tenant-branch-preservation.md`.

### Tech stack (fixed — do not replace)

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, MUI 7, MUI X DataGrid, React Query, Axios |
| Main API | NestJS, Prisma, MySQL, JWT auth |
| Payments | Spring Boot, JPA, MySQL, Razorpay (orders, verify, webhooks) |
| Font | Inter via @fontsource/inter |
| Illustrations | unDraw SVGs in frontend/src/assets/illustrations/ |

---

## 4. Architecture (current target)

**HLD v2 (authoritative):** `docs/project-plan/07-hld-saas-v2.md`  
**Diagram:** `docs/project-plan/diagrams/hld-saas-v2.svg`

```text
Actors: SUPER_ADMIN | TENANT_ADMIN | ADMIN | SECURITY | USER
         ↓
Platform Layer → Tenant Layer (organizationId on all data)
         ↓
React Frontend ──REST/JWT──► NestJS API ──HTTP──► Payment Service
         │                        │                      │
         │                        ▼                      ▼
         └── Razorpay Checkout ──► Razorpay ◄── Webhook ──► parking_payment_db
                                       │
                                  parking_lot_db
```

**Databases (separate — keep this split):**
- `parking_lot_db` — users, lots, floors, slots, vehicles, bookings, parking_events
- `parking_payment_db` — payments, status history, provider references

---

## 5. Business flow (must never break)

```text
1. User registers / logs in
2. User registers vehicle
3. User books available slot        → slot RESERVED
4. Security/Admin checks in         → parking event ACTIVE, slot OCCUPIED
5. Security/Admin checks out        → fee calculated, slot released
6. NestJS calls Payment Service     → Razorpay order created
7. User pays (Razorpay Checkout)    → webhook/verify → SUCCESS
8. Admin/Tenant admin views reports
```

**Lifecycle rules:**
- Booking reserves slot
- Check-in uses Booking ID or Booking Code
- Check-out uses Parking Event ID internally (shown as Session No in UI)
- Payment uses Payment ID internally (shown as Receipt No in UI)
- USER sees only own records; SECURITY sees operational data; ADMIN sees all within scope

---

## 6. Roles

### Implemented today

| Role | Access |
|------|--------|
| ADMIN | Full lot management, all payments/bookings/events, dashboards, mock payment |
| SECURITY | Check-in/out, active events, operational payments |
| USER | Own vehicles, bookings, parking history, payments |

### Planned (Phase 1+)

| Role | Access |
|------|--------|
| SUPER_ADMIN | Platform: tenants, plans, billing, cross-tenant analytics |
| TENANT_ADMIN | One org: branding, all lots, users, subscription |

---

## 7. What we completed (do not redo)

### Phase 0 — Foundation ✅

| Item | Status | Notes |
|------|--------|-------|
| NestJS API + Prisma schema | ✅ Done | backend/prisma/schema.prisma |
| React + MUI frontend | ✅ Done | Role-based AppLayout, all main pages |
| Auth (JWT) + RBAC | ✅ Done | ADMIN, SECURITY, USER |
| Parking lots / floors / slots | ✅ Done | Including lot details page |
| Vehicles CRUD | ✅ Done | |
| Bookings | ✅ Done | Slot reservation |
| Parking events (check-in/out) | ✅ Done | |
| Slot lifecycle service | ✅ Done | RESERVE → OCCUPY → RELEASE |
| Access policy service | ✅ Done | Role-based data access |
| Prisma error handling | ✅ Done | |

### UI cleanup phases ✅

| Phase | What | Report |
|-------|------|--------|
| 3a | Table readability | .grok/reports/phase-3a-table-readability.md |
| 3b | Details dialog/drawer | .grok/reports/phase-3b-details-dialog.md |
| 4 | Search + empty states | .grok/reports/phase-4-search-empty-state.md |
| 5 | API client factory | .grok/reports/phase-5-api-client-factory.md |
| fix-ui | View issues | .grok/reports/fix-ui-view-issues.md |

### Payment phases ✅ / 🔄

| Phase | What | Status |
|-------|------|--------|
| 7a | Payment contract alignment | ✅ Merged |
| 7b | Payment status history cleanup | ✅ Merged |
| 7c | Razorpay integration (payment service) | ✅ Merged |
| 8a | Razorpay payment verification endpoint | ✅ Merged |
| 8b | Frontend Razorpay checkout UI | ✅ Merged |
| 8c | Razorpay webhook handler | ✅ Merged (PR #35) |

### Design & planning ✅

| Item | Location |
|------|----------|
| Project plan folder | docs/project-plan/ |
| HLD v1 (archived) | docs/project-plan/diagrams/hld-current-system.jpg |
| HLD v2 (current) | docs/project-plan/diagrams/hld-saas-v2.svg |
| Inter font + unDraw illustrations | frontend/src/assets/illustrations/ |
| Illustration + EmptyState components | frontend/src/components/common/ |

### Phase 1 — Multi-tenancy 🔄

| Phase | What | Status | Report |
|-------|------|--------|--------|
| 1a | Organization schema + migration + seed | ✅ Merged (PR #40) | .grok/reports/phase-1a-organization-schema.md |
| 1a verification | Organization schema foundation audit | ✅ Merged (PR #65) | .grok/reports/phase-1a-verification.md |
| 1b | Backend tenant scoping enforcement | ✅ Merged (PR #42) | .grok/reports/phase-1b-tenant-scoping-backend.md |
| 1b verification | Backend tenant scoping audit | 🔄 PR pending | .grok/reports/phase-1b-verification.md |

### Frontend testing foundation ✅

| Item | Status | Report |
|------|--------|--------|
| Vitest + RTL coverage foundation | ✅ Merged (PR #51) | .grok/reports/frontend-test-coverage-rtl-vitest.md |

### E2E / Cypress rollout ✅

| Loop | What | Status | Artifact |
|------|------|--------|----------|
| 00 | Agent playbook + prompt pack | ✅ Merged (PR #55) | .grok/reports/e2e-agent-playbook.md |
| 01 | Journey registry J1–J14 | ✅ Merged (PR #56) | .grok/e2e/journey-registry.md |
| 02 | Cypress foundation (J1, J3, J14) | ✅ Merged (PR #57) | .grok/reports/cypress-e2e-foundation.md |
| 03 | Core parking smoke (J4–J6, J8) | ✅ Merged (PR #58) | .grok/reports/cypress-core-parking-smoke.md |
| 04 | CI smoke stage | ✅ Merged (PR #59) | .grok/reports/cypress-ci-smoke-stage.md |
| 05 | Release policy + PR template | ✅ Merged (PR #60) | .grok/reports/e2e-policy-and-release-pack.md |
| Final | Rollout summary | 🔄 PR pending | .grok/reports/e2e-rollout-final-summary.md |

**E2E control paths:**

```text
.grok/e2e/journey-registry.md       — sellable journey IDs (E2E 01)
.grok/prompts/e2e-*.md              — executable agent prompts
frontend/cypress/e2e/smoke/         — PR-gate smoke specs (E2E 02+)
.grok/reports/e2e-agent-playbook.md — rollout playbook (LOOP 00)
.grok/prompts/loop-engineering-prompt.md — full autonomous loop driver
```

Future UI/user-flow PRs must update Cypress smoke or document why not (PR template checklist in E2E 05).

---

## 8. In progress (current sprint)

```text
[x] E2E rollout — LOOP 00–05 merged; final summary PR open
     Report: .grok/reports/e2e-rollout-final-summary.md
     E2E CI: advisory (`e2e-smoke` continue-on-error)
     Phase 1c may proceed after final summary merges.

[ ] Phase 1c — Tenant onboarding API (deferred until E2E rollout done)
     Branch: feature/phase-1c-tenant-onboarding-api (from develop)
     Scope: SUPER_ADMIN tenant onboarding endpoints; org creation; initial TENANT_ADMIN user
     Report: TBD — .grok/reports/phase-1c-tenant-onboarding-api.md
     After 1c: Phase 1d frontend tenant context in AuthProvider
```

**Before starting new work:** read branch strategy §7 stacked PR plan for Phase 1.

---

## 9. Next up (prioritized queue)

Execute in this order unless the human redirects:

### Immediate (finish Phase 0)

```text
[x] Merge phase 8c webhook handler → develop (PR #35 ✅)
[x] Merge PR #36 docs/design foundation → develop (PR #36 ✅)
[ ] End-to-end test: book → check-in → check-out → Razorpay pay → webhook → receipt
[x] Phase 1a: organization schema (PR #40 ✅)
[x] Phase 1b: backend tenant scoping (PR #42 ✅)
[ ] Phase 1c: tenant onboarding API (NEXT)
[ ] Phase 1d: frontend tenant context in AuthProvider
[ ] Frontend RTL/Vitest foundation — PR pending (feature/frontend-test-coverage-rtl-vitest)
[ ] Remove or gate mock payment UI to dev-only if production path is complete
```

### Phase 1 — Multi-tenancy core (NEXT MAJOR MILESTONE)

```text
[x] Add Organization model to Prisma
[x] Add organizationId to direct tenant-scoped tables (User, ParkingLot, Vehicle, Booking, ParkingEvent, SlotAssignment)
[x] Expand Role enum: SUPER_ADMIN, TENANT_ADMIN
[x] JWT claims: organizationId
[x] Service-level query scoping + cross-tenant write protection (Phase 1b)
[ ] Tenant onboarding API (Phase 1c)
[ ] Frontend: tenant context in AuthProvider (Phase 1d)
[x] Migration: assign existing seed data to default org
```

**Exit criteria:** Two organizations in DB see completely separate data.

### Phase 2 — White-label

```text
[ ] Per-tenant logo, name, primaryColor
[ ] Dynamic MUI theme per tenant
[ ] Branded login + sidebar
[ ] TENANT_ADMIN settings page
```

### Phase 3 — Operator dashboard

```text
[ ] Occupancy %, active sessions, revenue metrics
[ ] Slot heatmap by floor
[ ] Role-specific dashboard content
```

### Phase 4 — Visual slot map (sales differentiator)

```text
[ ] Floor grid with color-coded slot status
[ ] Click slot → details drawer
[ ] Filter by slot type; polling refresh for SECURITY
```

### Phase 5 — Mobile security gate

```text
[ ] /security/gate route — large touch targets
[ ] Search booking code / vehicle number
[ ] One-handed check-in/out on 375px screen
```

### Phase 6 — Subscription & billing

```text
[ ] Plans: STARTER | PRO | ENTERPRISE
[ ] Enforce lot/user limits
[ ] Feature flags per plan
[ ] SUPER_ADMIN tenant management UI
```

### Phase 7 — Enterprise

```text
[ ] Multi-site operator console
[ ] CSV/PDF exports
[ ] External webhooks
[ ] Gate hardware API (future)
[ ] SSO/SAML (future)
```

Full roadmap: `docs/project-plan/03-roadmap.md`

---

## 10. Critical gaps (do not ignore)

| Gap | Phase | Impact if skipped |
|-----|-------|-------------------|
| No Organization / tenant model | 1 | Cannot sell to multiple customers |
| No organizationId on data | 1 | No data isolation — SaaS blocker |
| No SUPER_ADMIN / TENANT_ADMIN | 1 | No platform or tenant management |
| Single global branding | 2 | Weak sales — looks like one app |
| Table-only slot view | 4 | Loses to competitors in demos |
| Desktop-first security UI | 5 | Guards cannot operate at gate |
| No plan limits | 6 | Cannot monetize |

---

## 11. Shared frontend components (MUST reuse)

```text
frontend/src/components/common/
  AppDataGrid.tsx       — all tables
  PageHeader.tsx        — page titles
  StatusChip.tsx        — generic status
  SlotStatusChip.tsx    — slot statuses
  BookingStatusChip.tsx
  ParkingEventStatusChip.tsx
  PaymentStatusChip.tsx
  ConfirmDialog.tsx
  DetailsDialog.tsx     — Business Details + Technical Details sections
  EmptyState.tsx        — optional illustration prop
  Illustration.tsx      — unDraw assets
  SearchField.tsx
  StatCard.tsx
  InfoRows.tsx
  QueryErrorAlert.tsx
  AppSnackbar.tsx

frontend/src/lib/formatters.ts   — dates, currency, receipt/booking/session numbers
frontend/src/lib/statusStyles.ts
frontend/src/api/createApiClient.ts — DO NOT create duplicate axios instances
```

---

## 12. UI standards (layman-readable)

### Table columns — show business labels

| Entity | Show | Hide in table |
|--------|------|---------------|
| Vehicles | Vehicle Number, Type, Brand, Model, Color, Owner | vehicleId, userId |
| Bookings | Booking No, Code, Customer, Vehicle, Lot, Slot, Times, Status | raw IDs |
| Parking Events | Session No, Booking No, Customer, Vehicle, Lot, Slot, Status, Times, Fee | raw IDs |
| Payments | Receipt No, Booking No, Customer, Vehicle, Amount, Status, Method, Ref, Date | raw IDs |
| Parking Lots | Name, Address, City, Floors, Slots, Available, Status | parkingLotId |
| Slots | Slot Number, Floor, Lot, Vehicle Type, Status | slotId, floorId |

### Formatting conventions

```text
Payment ID 6     → Receipt No: PAY-000006
Booking ID 18    → Booking No: BK-000018
Event ID 14      → Session No: SES-000014
```

### Search inputs

```tsx
// ALWAYS text — never number input for search
type="text"
```

Search must work across: booking code, receipt no, vehicle number, customer name, email, lot name, slot number, payment reference, status.

### Details drawer structure

```text
Business Details  — names, codes, amounts, times, status
Technical Details — raw IDs (userId, slotId, etc.)
```

---

## 13. Backend conventions

```text
backend/src/
  auth/              — JWT, guards (extend for TenantGuard in Phase 1)
  common/access-policy.service.ts — role-based access (extend for tenant scope)
  slots/slot-lifecycle.service.ts — slot state machine (do not bypass)
  integrations/payment-service/    — HTTP client to payment microservice
  prisma/schema.prisma             — single source of DB truth
```

**Slot status machine:** AVAILABLE ↔ RESERVED ↔ OCCUPIED (+ MAINTENANCE)  
**Never** update slot status directly in controllers — use SlotLifecycleService.

---

## 14. Payment service conventions

```text
payment-service/
  Initiate → creates Razorpay order
  Verify   → signature check post-checkout
  Webhook  → POST /api/payments/webhook/razorpay (no JWT, signature auth)
  Mock     → dev/demo only
```

Keep payment DB separate. NestJS calls payment service at checkout — do not merge into monolith.

---

## 15. Verification checklist (before claiming done)

```bash
# Frontend (always if frontend touched)
cd frontend && npm run build

# Backend (if backend touched)
cd backend && npm run build && npm run test:cov

# Payment service (if payment-service touched)
cd payment-service && mvn clean package
```

**Report format after every task:**

```text
1. Files changed
2. What was implemented or fixed
3. Duplicate code removed (if any)
4. Build/test result
5. Manual test steps
6. Pending issues
7. MASTER_PROMPT.md updated (yes/no)
```

---

## 16. Anti-patterns (never do)

```text
✗ Duplicate DataGrid setup per page
✗ Duplicate status chip color logic
✗ Duplicate axios instances or API clients
✗ Expose raw database IDs in main table columns
✗ Rewrite working pages without explicit request
✗ Add unrelated features during bug fixes
✗ Replace MUI with another UI library
✗ Merge payment-service into NestJS backend
✗ Skip tenant scoping design on new models
✗ Use type="number" for search fields
✗ Ignore build errors
✗ Leave MASTER_PROMPT.md stale after completing work
✗ Download random UI themes or admin templates and paste into pages
✗ Add icons/illustrations/fonts without license verification and audit table entry
```

---

## 17. What makes us better than generic agent output

Generic agents will suggest: monolith merge, library rewrites, over-abstracted patterns, missing role checks, exposed UUIDs, duplicate components, and single-tenant shortcuts.

**We win by:**

1. **Vertical-specific flows** — hospital EV/handicapped slots, mall high-turnover, apartment assignments
2. **Layman UI** — facility managers are not developers; tables must read like a receipt
3. **Split payment service** — Razorpay isolation, webhook security, independent scaling
4. **Slot lifecycle as domain core** — single service owns state transitions
5. **Multi-tenant from Phase 1** — not bolted on later
6. **Visual slot map** — the demo feature that closes deals
7. **Mobile gate** — security staff are standing in sun/rain on phones
8. **White-label** — each tenant's brand, not ours
9. **Disciplined reuse** — shared components keep UI consistent at scale
10. **This document** — agents stay aligned across Claude, Codex, Cursor, Grok, Antigravity

---

## 18. Related documents

| Doc | Path |
|-----|------|
| Project plan index | docs/project-plan/README.md |
| Product vision | docs/project-plan/01-product-vision.md |
| SaaS architecture | docs/project-plan/02-architecture.md |
| Roadmap (detailed) | docs/project-plan/03-roadmap.md |
| Design resources | docs/project-plan/04-design-resources.md |
| Design system governance | docs/project-plan/08-design-system.md |
| Gap analysis | docs/project-plan/05-gap-analysis.md |
| HLD v1 (archived) | docs/project-plan/06-hld-current-system.md |
| HLD v2 (current) | docs/project-plan/07-hld-saas-v2.md |
| Branch strategy | docs/project-plan/09-branch-strategy.md |
| PR template | .github/pull_request_template.md |
| Agent coding rules | .grok/AGENTS.md |
| Phase reports | .grok/reports/ |

---

## 19. How to update this file (mandatory)

After **every** completed task, the agent or developer MUST:

1. Update **§8 In Progress** — move finished items out
2. Update **§7 Completed** — add row with status ✅ and report link
3. Update **§9 Next Up** — check off done items; add new discoveries
4. Update **§10 Critical gaps** — remove resolved gaps
5. Add entry to **Changelog** below
6. Update **Version** (patch for small tasks, minor for phase completion)
7. Update **Last updated** date
8. Update **Current branch** if changed

Keep entries factual and brief. Do not delete history — append to changelog.

---

## Changelog

| Date | Version | Author | Summary |
|------|---------|--------|---------|
| 2026-06-17 | 1.0.0 | Grok + human | Initial MASTER_PROMPT created. Captures mission, architecture v2, phases 0–8 status, phases 1–7 queue, coding standards, anti-patterns, update protocol. Phase 8c webhook in progress on feature branch. Next: merge 8c, E2E payment test, Phase 1 multi-tenancy. |
| 2026-06-17 | 1.1.0 | Grok + human | Added design system governance: research→license→compare→apply rule in MASTER_PROMPT §2 and §16. Created docs/project-plan/08-design-system.md with license audit, rejected alternatives, and agent checklist. Formalized what was done implicitly earlier (MUI-only, Inter, curated unDraw). |
| 2026-06-17 | 1.1.1 | Grok + human | Phase 8c merged (PR #35). docs/saas branch synced with develop. PR #36 open and mergeable; CI green. Updated in-progress and next-up sections. |
| 2026-06-17 | 1.2.0 | Grok + human | PR #36 merged. Phase 0 complete. Added state-of-the-art branch strategy (09-branch-strategy.md), GitHub PR template, SemVer release plan. Phase 1 stacked PR plan ready. |
| 2026-06-17 | 1.2.1 | Grok | Phase 1a implementation: Organization model, Role expansion, organizationId on tenant tables, migration backfill, prisma seed, service wiring. PR pending. |
| 2026-06-17 | 1.2.2 | Grok | Added Phase 1a completion report (.grok/reports/phase-1a-organization-schema.md); updated reports README with payment phases 7a–8c and Phase 1a. |
| 2026-06-17 | 1.2.3 | Grok | PR #41 merged: post-merge docs cleanup (current branch develop, Phase 1a report Floor/Slot note). |
| 2026-06-18 | 1.3.0 | Grok | Phase 1b: backend tenant scoping — JWT organizationId, AccessPolicy org helpers, scoped services, cross-tenant tests. PR open. |
| 2026-06-18 | 1.4.0 | Grok | Phase 1b merged (PR #42): tenant scoping, Users API leak fix, enriched parking-events/bookings API (no slots fan-out). Next: Phase 1c tenant onboarding API. |
| 2026-06-18 | 1.4.2 | Grok | CI path-based jobs on `fix/ci-path-based-jobs`: `dorny/paths-filter` change detection, conditional backend/frontend/payment jobs on PRs, full CI on push, `ci-summary` gate. PR #52 merged. |
| 2026-06-18 | 1.4.3 | Grok | Created `single-tenant` branch from `main`; added to CI triggers; documented preservation/hotfix policy and ruleset checklist. Never merge `develop` into `single-tenant`. PR #53 merged. |
| 2026-06-18 | 1.4.4 | Grok | Added E2E/Cypress agent playbook and prompt pack. Future UI/user-flow PRs must update Cypress smoke or document why not. PR #55 merged. |
| 2026-06-18 | 1.4.4 | Grok | E2E 01: journey registry J1–J14 and hybrid strategy report. PR #56 merged. |
| 2026-06-18 | 1.4.4 | Grok | E2E 02: Cypress foundation — J1/J3/J14 smoke, e2e scripts. PR #57 merged. |
| 2026-06-18 | 1.4.4 | Grok | E2E 03: Core parking smoke — J4/J5/J6/J8 + API fan-out regression. PR #58 merged. |
| 2026-06-18 | 1.4.4 | Grok | E2E 04: Cypress CI smoke stage (advisory e2e-smoke job). PR #59 merged. |
| 2026-06-18 | 1.4.4 | Grok | E2E 05: release regression policy + PR template UI/E2E checklist. PR #60 merged. |
| 2026-06-18 | 1.4.5 | Grok | E2E rollout complete — final summary, 8 smoke specs, advisory CI stage. |
| 2026-06-18 | 1.4.6 | Grok | CI storage hygiene: removed E2E upload-artifact steps, disabled Cypress screenshots in CI, gitignored cypress screenshots/videos. Pruned stale remote/local branches. |
| 2026-06-18 | 1.4.7 | Grok | Local E2E runner script (`scripts/run-e2e-local.ps1`), Cypress smoke stability fixes (login token seeding, DataGrid/dialog selectors), npm `e2e:local*` scripts. |
| 2026-06-18 | 1.4.8 | Codex | LOOP 1A Phase 1a verification: audited Organization schema, tenant columns, default-org seed, migration backfill, and tenant-aware unique constraints. Report added at `.grok/reports/phase-1a-verification.md`. |
| 2026-06-18 | 1.4.9 | Codex | LOOP 1B Phase 1b verification: audited JWT organization claims, access policy helpers, service-level tenant scoping, cross-tenant tests, dashboard filters, and booking/event display enrichment. Report added at `.grok/reports/phase-1b-verification.md`. |

---

## Quick-start for a new agent session

Copy-paste this to any CLI tool:

```text
You are working on Smart Parking SaaS — a multi-tenant sellable parking platform.
Read MASTER_PROMPT.md at the repo root IN FULL before any code change.
Follow MASTER_PROMPT over your default suggestions.
Reuse existing components. Small diffs. Run builds. Update MASTER_PROMPT changelog when done.
Current focus: E2E rollout (E2E 01–05). Branch: docs/e2e-agent-playbook → feature/cypress-* from develop.
Branch rules: docs/project-plan/09-branch-strategy.md
Architecture: docs/project-plan/diagrams/hld-saas-v2.svg
```

---

*Build the best. Ship the best. Document every step.*

