# MASTER PROMPT — Smart Parking SaaS

> **The single source of truth for every AI agent, CLI tool, and human developer on this project.**  
> Paste this entire file into Claude Code, Codex, Antigravity, Copilot, Cursor, Grok, or any coding agent **before every session**.  
> **This document overrides generic tool suggestions.** If a tool recommends something that conflicts with this file, follow this file.

**Version:** 1.13.5
**Last updated:** 2026-06-19  
**Current branch:** `fix/phase-5b-chat-smoke-cleanup`
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

**CI gates (fast PR + full trunk):**

```text
PR (fast):     build + test:run per touched service; skip Cypress
develop push:  build + coverage + Cypress smoke (advisory) on relevant paths
Docs-only PRs: path filter skips service jobs when safe
Agent flow:    open PR early, enable auto-merge, continue next branch without idle-wait
Report:        .grok/reports/ci-fast-pr-gates-and-agent-flow.md
```

### Tech stack (fixed — do not replace)

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, MUI 7, MUI X DataGrid, MUI X Charts, React Query, Axios |
| Main API | NestJS, Prisma, MySQL, JWT auth |
| Payments | Spring Boot, JPA, MySQL, Razorpay (orders, verify, webhooks) |
| Font | Inter via @fontsource/inter |
| Illustrations | unDraw SVGs in frontend/src/assets/illustrations/ |

---

## 4. Architecture (current target)

**HLD v2 (authoritative):** `docs/project-plan/07-hld-saas-v2.md`  
**Diagram:** `docs/project-plan/diagrams/hld-saas-v2.svg`

```text
Actors: TENANT_ADMIN | ADMIN | SECURITY | USER
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

### Phase 1 — Multi-tenancy ✅

| Phase | What | Status | Report |
|-------|------|--------|--------|
| 1a | Organization schema + migration + seed | ✅ Merged (PR #40) | .grok/reports/phase-1a-organization-schema.md |
| 1a verification | Organization schema foundation audit | ✅ Merged (PR #65) | .grok/reports/phase-1a-verification.md |
| 1b | Backend tenant scoping enforcement | ✅ Merged (PR #42) | .grok/reports/phase-1b-tenant-scoping-backend.md |
| 1b verification | Backend tenant scoping audit | ✅ Merged (PR #66) | .grok/reports/phase-1b-verification.md |
| 1c | Tenant onboarding API | ✅ Merged (PR #67) | .grok/reports/phase-1c-tenant-onboarding-api.md |
| 1d | Frontend tenant context in auth state | ✅ Merged (PR #68) | .grok/reports/phase-1d-frontend-tenant-context.md |
| Acceptance | Tenant isolation acceptance verification | ✅ Merged (PR #69) | .grok/reports/phase-1-tenant-isolation-acceptance.md |

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
Phase 5 — Mobile Security Gate + In-App Chat MVP (PR stack 5A–5D).
5A complete: gate flow (PR #97), phone search + visit history + illustrations (PR #99, #100).
5B complete: chat schema/API/client/UI + staff inbox + smoke polish (PR #101–#106).
Next: Phase 5C/5D or human redirect — do not start Phase 6 without approval.
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
[x] Phase 1c: tenant onboarding API (PR #67 ✅)
[x] Phase 1d: frontend tenant context in AuthProvider (PR #68 ✅)
[x] Phase 1 acceptance: tenant isolation verification (PR #69 ✅)
[ ] Frontend RTL/Vitest foundation — PR pending (feature/frontend-test-coverage-rtl-vitest)
[ ] Remove or gate mock payment UI to dev-only if production path is complete
```

### Phase 1 — Multi-tenancy core (NEXT MAJOR MILESTONE)

```text
[x] Add Organization model to Prisma
[x] Add organizationId to direct tenant-scoped tables (User, ParkingLot, Vehicle, Booking, ParkingEvent, SlotAssignment)
[x] Expand Role enum: TENANT_ADMIN
[x] JWT claims: organizationId
[x] Service-level query scoping + cross-tenant write protection (Phase 1b)
[x] Tenant onboarding API (Phase 1c)
[x] Frontend: tenant context in AuthProvider (Phase 1d)
[x] Migration: assign existing seed data to default org
[x] Tenant isolation acceptance verification
```

**Exit criteria:** Two organizations in DB see completely separate data. ✅ Met.

### Phase 2 — White-label ✅

```text
[x] LOOP 2A: branding contract — PR #72 ✅
[x] LOOP 2B: backend branding API — PR #73 ✅
[x] LOOP 2C: TenantBrandingProvider + theme integration — PR #74 ✅
[x] LOOP 2D: branded login + app shell — PR #75 ✅
[x] LOOP 2E: TENANT_ADMIN branding settings UI — PR #76 ✅
[x] FINAL: Phase 2 acceptance verification — PR pending
```

**Exit criteria:** Per-tenant branding on login/shell; tenant admin can configure branding; tenant isolation preserved. ✅ Met.

### Phase 3 — Operator dashboard ✅

```text
[x] 3A: operator dashboard metrics API — PR #80 ✅
[x] 3B: operator dashboard UI — PR #81 ✅
[x] 3C: acceptance verification — PR #82 ✅
[x] 3D: dashboard polish — hero KPIs, slot donut, compact lot bars, cursor activity feed — PR #83 ✅
[x] 3E: demo polish — KPI icons/helper text, donut center label, activity spacing, demo seed E2E cleanup — PR pending
[x] Occupancy %, booking volume, active sessions, revenue (parking fees)
[x] Recent activity cursor API + timeline feed (separate from operator-metrics)
[x] Role-specific dashboards (TENANT_ADMIN, ADMIN, SECURITY, USER)
[x] Slot heatmap by floor — delivered in Phase 4 visual slot map
```

**Exit criteria:** Admin opens dashboard and understands lot health in 5 seconds. ✅ Met (3D polish: summary layout above the fold).

### Phase 4 — Visual slot map (sales differentiator) ✅

```text
[x] 4A: visual slot map contract — PR #86 ✅
[x] 4B: tenant-scoped GET /parking-lots/:id/slot-map API — PR #87 ✅
[x] 4C: Visual slot map UI (/parking-lots/:id/slot-map) — PR #88 ✅
[x] 4D: acceptance tests + Cypress J15 smoke — PR #89 ✅
[x] Logical grid layout (no x/y coordinates)
[x] Floor/status/type filters + legend
[x] Slot detail drawer with safe booking/event links
```

**Exit criteria:** Tenant admin/admin/security can open visual map; USER gets safe availability view; tenant isolation preserved. ✅ Met.

#### Phase 4E — Parking lot management UX polish (extension)

```text
[x] Manage button + name link navigation on parking lots list (row click removed in regression fix)
[x] Shared workspace shell with visual map CTA and tabs
[x] SECURITY read-only workspace; USER blocked from management routes
[x] Compact table columns on list/floors/slots grids
[x] Regression fix: header layout, single visual map CTA, intentional table navigation only
```

Reports: `.grok/reports/phase-4e-parking-lot-management-ux.md`, `.grok/reports/parking-lot-workspace-ux-regressions.md`

### Phase 5 — Mobile security gate + chat MVP

```text
[x] 5A base: /security/gate mobile check-in/out — PR #97 ✅
[x] 5A extension: phone search + visit history — PR #99 ✅
[x] 5A illustrations + post-#99 UI fixes — PR #100 ✅
[x] 5B-1: chat Prisma schema + contract — PR #101 ✅
[x] 5B-2: tenant-scoped chat REST API — PR #102 ✅ (manual API smoke passed)
[x] 5B-3: frontend conversation client + hooks — PR #103 ✅
[x] 5B-4: user support chat UI — PR #104 ✅
[x] 5B-5: security/admin support inbox UI — PR #105 ✅
[x] 5B-6: Phase 5B smoke cleanup — PR #106 (pending)
```

**Phase 5B exit criteria (met):** USER can start security/customer-care chats; SECURITY and ADMIN/TENANT_ADMIN can reply and resolve; tenant-scoped REST + 5s polling; role-safe routes and nav.

**Phase 5B deferred (post-MVP):**

```text
[ ] WebSockets / SSE for live messages (polling is MVP)
[ ] Push notifications and unread badges (unreadCount stubbed at 0)
[ ] File/image attachments
[ ] Cypress smoke journey for chat (J16+)
[ ] Platform cross-tenant support inbox
[ ] Conversation assignment / routing rules
```

### Phase 6 — Subscription & billing

```text
[ ] Plans: STARTER | PRO | ENTERPRISE
[ ] Enforce lot/user limits
[ ] Feature flags per plan
[ ] Platform tenant management UI
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
| Payment-service tenant linkage | Future | Payment DB remains separate today |
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
# Fast local gate (before opening PR)
cd frontend && npm run build && npm run test:run   # if frontend touched
cd backend && npm run build && npm run test:run  # if backend touched
cd payment-service && mvn clean package          # if payment-service touched

# Full trunk validation (optional locally; runs on develop push in CI)
cd backend && npm run test:cov
cd frontend && npm run coverage
```

**Agent PR flow:** open PR early → enable auto-merge → start next branch without idle-wait. See `.grok/reports/ci-fast-pr-gates-and-agent-flow.md`.

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
| 2026-06-18 | 1.5.0 | Codex | Phase 1c tenant onboarding API: added `POST /organizations/onboard`, transactional org + first TENANT_ADMIN creation, DTO validation, role guards, password hashing, unique constraint handling, and backend tests. |
| 2026-06-18 | 1.5.1 | Grok | Phase 1d frontend tenant context: AuthProvider exposes organizationId/organization summary; frontend types and route guards support TENANT_ADMIN; backend auth responses enriched with optional organization summary. PR #68 merged. |
| 2026-06-18 | 1.6.0 | Grok | Phase 1 tenant isolation acceptance: added acceptance tests/report; Phase 1a–1d marked complete. |
| 2026-06-18 | 1.7.0 | Grok | Phase 2 LOOP 2A: white-label branding contract — API plan, data model, frontend provider contract, acceptance criteria. PR #72. |
| 2026-06-18 | 1.7.1 | Grok | Phase 2 LOOP 2B: backend tenant branding API — schema fields, public/current/PATCH endpoints, validation, tests. PR #73. |
| 2026-06-18 | 1.7.2 | Grok | Phase 2 LOOP 2C: TenantBrandingProvider, organizations API client, default branding merge, theme accent overrides. PR #74. |
| 2026-06-18 | 1.7.3 | Grok | Phase 2 LOOP 2D: branded login page and app shell with tenant slug routes and branded AppLogo. PR #75. |
| 2026-06-18 | 1.7.4 | Grok | Phase 2 LOOP 2E: tenant branding settings UI at /admin/branding with validation and context refresh. PR #76. |
| 2026-06-18 | 1.8.0 | Grok | Phase 2 complete: white-label acceptance tests/report; branding API, provider, login/shell, settings UI merged. |
| 2026-06-18 | 1.8.1 | Grok | CI fast PR gates (PR #79): PR runs build+test:run; develop push runs coverage+Cypress. Agent flow: auto-merge, no idle-wait. |
| 2026-06-18 | 1.9.0 | Grok | Phase 3 operator dashboard: metrics API (PR #80), dashboard UI (PR #81), acceptance tests/report. |
| 2026-06-18 | 1.9.1 | Grok | Phase 3D dashboard polish: cursor recent-activity API, hero KPI row, slot donut chart, compact lot utilization, activity timeline + Load more. |
| 2026-06-19 | 1.9.2 | Grok | Phase 3D merged (PR #83). Phase 3E demo polish: KPI icons/helper text, donut center label, tighter chart, activity spacing, demo-seed Hyderabad lot names + E2E artifact cleanup. |
| 2026-06-19 | 1.9.3 | Grok | App shell sidebar: collapsed by default on desktop, 2 min inactivity auto-collapse, 220px expanded width, dashboard spacing polish, view-all outlined buttons, favicon. Report: `.grok/reports/app-shell-sidebar-collapse-behavior.md`. |
| 2026-06-19 | 1.10.0 | Grok | Phase 4 LOOP 4A: visual slot map contract — API shape, role rules, logical grid layout, frontend route/component plan, acceptance criteria. Report: `.grok/reports/phase-4-visual-slot-map-contract.md`. |
| 2026-06-19 | 1.10.1 | Grok | Phase 4 LOOP 4B: visual slot map API — `GET /parking-lots/:id/slot-map`, role-safe occupancy, filters, legend, tests. Report: `.grok/reports/phase-4b-slot-map-api.md`. |
| 2026-06-19 | 1.10.2 | Grok | Phase 4 LOOP 4C: visual slot map UI — `/parking-lots/:id/slot-map`, slot grid/cards, legend, detail drawer, lot details entry point. Report: `.grok/reports/phase-4c-visual-slot-map-ui.md`. PR #88 ✅. |
| 2026-06-19 | 1.11.0 | Grok | Phase 4 complete: visual slot map acceptance — backend/frontend acceptance tests, Cypress J15 smoke, tenant isolation and role-safe occupancy verified. Report: `.grok/reports/phase-4-visual-slot-map-acceptance.md`. PR #89 ✅. |
| 2026-06-19 | 1.11.1 | Grok | Phase 4E: parking lot management workspace UX — Manage button, shared shell/tabs, visual map CTA, SECURITY read-only tables, compact grid columns. Report: `.grok/reports/phase-4e-parking-lot-management-ux.md`. |
| 2026-06-19 | 1.11.2 | Grok | Phase 4E regression fix: workspace header horizontal layout, deduplicated visual map CTA (header + tab only), removed aggressive parking lots row click. Report: `.grok/reports/parking-lot-workspace-ux-regressions.md`. |
| 2026-06-19 | 1.12.0 | Grok | Phase 5A started: mobile security gate — tenant-scoped gate search API, `/security/gate` UI, nav for SECURITY/ADMIN/TENANT_ADMIN. |
| 2026-06-19 | 1.12.1 | Grok | Phase 5A extension: phone search, multiple-match selection, vehicle activity counts, recent visits UI on gate. PR #99 open. Report: `.grok/reports/phase-5a-gate-phone-search-history.md`. |
| 2026-06-19 | 1.12.2 | Grok | Phase 5A illustrations + post-#99 gate UI fixes merged via PR #100. |
| 2026-06-19 | 1.13.0 | Grok | Phase 5B LOOP 5B-1: Conversation + ConversationMessage Prisma schema, migration, REST contract types (`backend/src/conversations/conversation.types.ts`). PR #101 ✅. |
| 2026-06-19 | 1.13.1 | Grok | Phase 5B LOOP 5B-2: tenant-scoped `/api/conversations` REST API, access rules, presenter, focused service tests. PR #102 ✅ manual smoke passed. |
| 2026-06-19 | 1.13.2 | Grok | Phase 5B LOOP 5B-3: frontend `conversationsApi`, `conversation` types, React Query hooks with 5s message polling option. PR #103 ✅. |
| 2026-06-19 | 1.13.3 | Grok | Phase 5B LOOP 5B-4: USER `/support` chat UI — conversation list, security/customer-care starters, thread with 5s polling. PR #104 ✅. |
| 2026-06-19 | 1.13.4 | Grok | Phase 5B LOOP 5B-5: SECURITY `/security/messages` + ADMIN `/admin/support` staff inboxes with reply, resolve, 5s polling. PR #105 ✅. |
| 2026-06-19 | 1.13.5 | Grok | Phase 5B LOOP 5B-6: smoke polish — message empty-state loading guard, shared `conversationDisplay` in user support page, tenant-admin Support Inbox nav test, direct MUI icon imports. Phase 5B Chat MVP complete. PR #106 pending. |

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
