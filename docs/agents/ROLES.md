# Multi-Agent Roles — Smart Parking SaaS

> **Purpose:** Define how AI agents (and humans) split work on this monorepo.  
> **Read first:** [`MASTER_PROMPT.md`](../../MASTER_PROMPT.md) — every agent obeys it over generic tool defaults.  
> **Branch rules:** [`docs/project-plan/09-branch-strategy.md`](../project-plan/09-branch-strategy.md)  
> **Task library:** [`.grok/prompts/`](../../.grok/prompts/) — copy-paste agent missions per phase  
> **Completion archive:** [`.grok/reports/`](../../.grok/reports/) — what was done, PR links, lessons learned  
> **Review gate:** [`QUALITY_REVIEW.md`](./QUALITY_REVIEW.md) — architecture + code quality checklist for Role ⑤

---

## 1. Product map (end-to-end)

Use this to decide **which agent owns a task**.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ACTORS: SUPER_ADMIN | TENANT_ADMIN | ADMIN | SECURITY | USER           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  EXPERIENCE LAYER — React 18 + Vite + MUI 7 + React Query + Axios         │
│  frontend/  →  parking.imkpk.in (Vercel)                                │
│  Auth, dashboards, bookings, gate, slot map, payments UI, support chat    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ REST + JWT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CORE API LAYER — NestJS + Prisma + PostgreSQL (Neon)                   │
│  backend/  →  smart-parking-backend-jasa.onrender.com                   │
│  Users, orgs, lots/floors/slots, vehicles, bookings, parking events,    │
│  conversations, dashboards, JWT, CORS, plan limits                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP (checkout / payment proxy)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PAYMENTS LAYER — Spring Boot + JPA + PostgreSQL + Razorpay             │
│  payment-service/  →  smart-parking-payment-service.onrender.com        │
│  Initiate, verify, webhooks, mock provider, payment reports             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                              Razorpay (external)
```

### Critical business path (must not break)

```text
Register/Login → Vehicle → Book slot → Check-in → Check-out → Pay → Receipt
```

### Production URLs (reference)

| Service | URL |
|---------|-----|
| Frontend | https://parking.imkpk.in |
| NestJS API | https://smart-parking-backend-jasa.onrender.com |
| Payment API | https://smart-parking-payment-service.onrender.com |
| Integration branch | `develop` |

### CI path filters (what runs when you change code)

| Path changed | CI jobs that run on **PR** |
|--------------|----------------------------|
| `frontend/**` | React Frontend |
| `backend/**` | NestJS Backend |
| `payment-service/**` | Spring Boot Payment Service |
| `.github/workflows/**` | All three |
| **Push to `develop`** | All three (full trunk gate) |

---

## 2. Multi-agent model (5 roles + you)

```text
                    ┌──────────────────────┐
                    │  YOU (Product Owner) │
                    │  Approve merge/env │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ ① ORCHESTRATOR       │
                    │ Plan · split · route │
                    └──────────┬───────────┘
           ┌───────────────────┼───────────────────┐
           │                   │                   │
  ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
  │ ② CORE API      │ │ ③ EXPERIENCE    │ │ ④ PAYMENTS      │
  │ NestJS + Prisma │ │ React + MUI     │ │ Spring Boot     │
  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │ ⑤ QUALITY, ARCHITECTURE & RELEASE │
                    │ Review · architecture · CI        │
                    └───────────────────────────────────┘
```

**Rule:** One concern per branch. One concern per PR. Never reuse a long-lived `fix/everything` branch.

---

## 3. Role definitions

### Role ① — Orchestrator

| Field | Definition |
|-------|------------|
| **Mission** | Turn a human goal into a small, ordered plan; assign workers; prevent scope creep and file conflicts. |
| **Owns** | Task breakdown, branch names, PR order, handoff notes, MASTER_PROMPT changelog entries (or delegates to workers). |
| **Never touches** | Application code (except tiny doc fixes). Never merges without Role ⑤ sign-off. |
| **Reads** | `MASTER_PROMPT.md`, `docs/project-plan/`, open PRs, CI status. |
| **Outputs** | Plan (max 5 bullets), branch list, per-agent prompts, merge sequence. |
| **Verify** | Each subtask maps to exactly one worker; no two workers edit the same folder in parallel. |

**Starter prompt:**

```text
You are the Orchestrator for Smart Parking SaaS.
Read MASTER_PROMPT.md and docs/agents/ROLES.md.
Goal: [USER GOAL]
Split into subtasks, assign roles ②–⑤, name branches (fix/ or feature/), define merge order.
Do not write code until workers are assigned.
```

---

### Role ② — Core API Agent (NestJS)

| Field | Definition |
|-------|------------|
| **Mission** | Tenant-aware REST API, auth, parking operations, Prisma schema/migrations, business rules. |
| **Owns** | `backend/` — modules, controllers, services, DTOs, Prisma, `backend/docs/openapi.yaml`, `backend/docs/DEPLOY.md` |
| **Never touches** | `frontend/`, `payment-service/`, Vercel config. No UI copy or MUI. |
| **Key contracts** | Global prefix `/api`, JWT payload, `organizationId` scoping, checkout → payment service HTTP. |
| **Outputs** | Focused PR, migration if needed, service tests, OpenAPI sync if routes change. |
| **Verify** | `cd backend && npm run build && npm run test:run` |

**Mocking rule:** Unit tests mock Prisma/services — **never hit Neon or Render in tests.**

**Starter prompt:**

```text
You are the Core API Agent (NestJS).
Read MASTER_PROMPT.md. Work only in backend/.
Task: [SPECIFIC API/SCHEMA TASK]
Reuse existing services and presenters. Small diff. Run backend build + tests.
Do not change frontend or payment-service unless task explicitly requires contract doc only.
```

---

### Role ③ — Experience Agent (React)

| Field | Definition |
|-------|------------|
| **Mission** | Role-based UI, dashboards, forms, API clients, env-based URLs, MUI design system. |
| **Owns** | `frontend/` — pages, components, hooks, `api/*`, `lib/*`, `theme.ts`, `vercel.json`, `.env.example` |
| **Never touches** | `backend/` Prisma/migrations, `payment-service/` Java. No new UI libraries. |
| **Key contracts** | `apiClient` / `paymentsApiClient`, `VITE_API_URL`, `VITE_PAYMENT_SERVICE_URL`, shared components in `components/common/`. |
| **Outputs** | Focused PR, Vitest tests for new logic, no localhost hardcoding in production paths. |
| **Verify** | `cd frontend && npm run build && npm run test:run` |

**Mocking rule:** Vitest mocks `@/api/client` and payment APIs — **never call production Render URLs in unit tests.**

**Starter prompt:**

```text
You are the Experience Agent (React + MUI).
Read MASTER_PROMPT.md and docs/project-plan/08-design-system.md.
Work only in frontend/.
Task: [SPECIFIC UI/API CLIENT TASK]
Reuse shared components. Use theme tokens. Run frontend build + tests.
```

---

### Role ④ — Payments Agent (Spring Boot)

| Field | Definition |
|-------|------------|
| **Mission** | Payment records, Razorpay orders/verify/webhooks, mock provider, payment DB. |
| **Owns** | `payment-service/` — Java services, controllers, gateway, `application*.properties`, Dockerfile, payment README. |
| **Never touches** | `backend/` NestJS routes, `frontend/` checkout UI (except if Orchestrator sequences handoff). |
| **Key contracts** | `/api/payments/*`, JWT from NestJS, `PAYMENT_PROVIDER=MOCK|RAZORPAY`, webhook signature. |
| **Outputs** | Focused PR, JUnit tests, H2/Mockito only in tests. **Stay on Java 21** unless Orchestrator approves JDK upgrade. |
| **Verify** | `cd payment-service && mvn -B clean package` |

**Mocking rule:** Tests use **H2 in-memory DB** + **Mockito** + **MockMvc** — **never hit real Razorpay or Render.**

**Starter prompt:**

```text
You are the Payments Agent (Spring Boot).
Read MASTER_PROMPT.md and payment-service/README.md.
Work only in payment-service/.
Task: [SPECIFIC PAYMENT TASK]
Keep Java 21 unless explicitly upgrading JDK. Run mvn clean package.
Do not change NestJS or React in the same PR.
```

---

### Role ⑤ — Quality, Architecture & Release Agent

| Field | Definition |
|-------|------------|
| **Mission** | Code quality, architecture compliance, tests, CI, deploy readiness — **mandatory gate between worker and merge**. |
| **Owns** | [`QUALITY_REVIEW.md`](./QUALITY_REVIEW.md) checklist, `.github/workflows/`, Cypress smoke (when relevant), review comments, deploy checklists, `.grok/reports/` close-out. |
| **Never touches** | Feature implementation (only test fixes and CI config directly related to the gate). |
| **Reviews** | Reusable code · duplicate logic · service boundaries · design patterns · React Hooks · React Query · MUI/design-system · tenant-aware architecture · backend service/controller split · payment-service separation · tests/CI/secrets |
| **Key duties** | Apply `QUALITY_REVIEW.md` §1–10; run `/review`; block merge on architecture blockers; confirm mocks not hitting prod; post-merge report + env reminders. |
| **Outputs** | PR review (template in `QUALITY_REVIEW.md`), optional `.grok/review/pr{N}review.md`, CI fix PRs, completion report. |
| **Verify** | Checklist complete; CI green; no secrets in diff; no tenant or hooks blockers. |

**Human-only:** Paste production secrets in Vercel/Render dashboards (never commit `.env`).

**Starter prompt:**

```text
You are the Quality, Architecture & Release Agent (Role ⑤).
Read docs/agents/QUALITY_REVIEW.md and apply every applicable checklist section.
Review PR #[N] against MASTER_PROMPT.md, ROLES.md, and .grok/AGENTS.md.
Check: reusable code, duplication, service boundaries, design patterns,
React Hooks, React Query, MUI/design-system, tenant scoping,
backend controller/service split, payment-service separation, tests/CI/secrets.
Output verdict using the template in QUALITY_REVIEW.md.
Do not implement features — only test/CI fixes if CI is broken.
```

---

## 4. Standard workflow (going forward)

```text
Orchestrator → Worker agent → Quality, Architecture & Review (⑤) → CI/release gate → Report → Merge
```

Workers implement. Role ⑤ reviews **before** merge — not only after CI fails. See [`QUALITY_REVIEW.md`](./QUALITY_REVIEW.md).

### Phase A — Intake (Orchestrator)

1. Human states goal in one sentence.
2. Orchestrator reads `MASTER_PROMPT` Completed / In Progress / Next Up.
3. Orchestrator outputs:

```text
Subtasks:
  1. [Role] — [branch] — [acceptance criterion]
  2. ...

Merge order: 1 → 2 → 3
Parallel OK: yes/no per row
```

### Phase B — Execute (Workers ②③④)

| Order | When |
|-------|------|
| **Schema/API first** | If DB or contract changes |
| **Payment second** | If checkout/verify/webhook changes |
| **Frontend last** | After API contract is stable |
| **Parallel** | Only if folders don't overlap (e.g. frontend copy + backend unrelated bug) |

Each worker:

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b fix/short-description
# implement
# run service-specific build + tests
git push -u origin fix/short-description
# open PR → develop
```

### Phase C — Quality, architecture & CI gate (Role ⑤)

1. Worker opens PR → fast CI runs (touched services only).
2. Role ⑤ runs [`QUALITY_REVIEW.md`](./QUALITY_REVIEW.md) checklist (§1–10).
3. Verdict: **APPROVED** | **CHANGES REQUESTED** (blockers must be fixed in PR).
4. After approval + green CI → merge eligible.
5. Push to `develop`: full CI on all three services.

Role ⑤ may file a `fix/review-xxx` branch only for broken CI or test gaps — not feature rework unless Orchestrator assigns it.

### Phase D — Release (Human + Role ⑤)

After merge to `develop`:

| Target | Action |
|--------|--------|
| Vercel | Auto-deploy from `develop`; confirm `VITE_*` env vars |
| Render backend | Auto-deploy or manual; confirm `DATABASE_URL`, `CORS`, `FRONTEND_URL` |
| Render payment | Auto-deploy or manual; confirm `PAYMENT_PROVIDER`, Razorpay keys |
| Neon | `prisma migrate deploy` on backend startup — never `migrate reset` |

---

## 5. Handoff template

Copy between agents:

```markdown
## Handoff: [feature/fix name]

**From:** Role [②|③|④]
**To:** Role [next]
**Branch:** fix/xxx (PR #N)

### Contract
- Endpoint / env / schema change: …

### Done
- [ ] Build passes
- [ ] Tests pass (mocked, no prod URLs)
- [ ] Self-check against QUALITY_REVIEW.md (worker folder sections)

### Your task
- …

### Do not
- …
```

---

## 6. Anti-patterns (learned from this repo)

| Don't | Do instead |
|-------|------------|
| One branch for deploy + DB + Java 25 + author renames | Separate branches per concern |
| Java 25 on payment-service without Spring Boot upgrade | Stay Java 21 until stack is ready |
| Hardcode `localhost` in frontend production fallbacks | `VITE_API_URL` / `apiEnv.ts` only |
| Agent edits all three services in one PR | Orchestrator splits; sequential merge |
| Skip Role ⑤ on "small" changes | Always run QUALITY_REVIEW.md gate before merge |
| Merge on green CI only, no architecture review | Worker → ⑤ review → CI → merge |
| Duplicate DataGrid/chip/dialog per page | Extend `components/common/*` |
| `useEffect` fetch instead of `useQuery` | React Query with proper `queryKey` + invalidation |
| Commit Razorpay/Neon secrets | Dashboard env vars only |

---

## 7. Quick routing table

| If the task is about… | Agent |
|------------------------|-------|
| Login, JWT, CORS, Prisma, bookings, check-in/out, chat API | ② Core API |
| Page UI, DataGrid, charts, env vars, Vercel SPA routing | ③ Experience |
| Razorpay, payment status, webhooks, `payment-service` build | ④ Payments |
| CI failing, PR review, architecture/duplication audit, Cypress, deploy checklist | ⑤ Quality, Architecture & Release |
| "Fix production" / multi-surface outage | ① Orchestrator splits → ②③④⑤ |
| MASTER_PROMPT, roadmap, design doc only | ① Orchestrator or `docs/` branch |

---

## 8. How `.grok/prompts` and `.grok/reports` fit in

These folders existed **before** `ROLES.md`. They are not replaced by the 5 roles — they **feed** them.

```text
MASTER_PROMPT.md              ← laws (always read)
docs/agents/ROLES.md          ← who does what (roles + routing)
docs/agents/QUALITY_REVIEW.md ← how to gate before merge (Role ⑤)
.grok/AGENTS.md               ← how to code (standards)
.grok/prompts/                ← WHAT to do next (executable missions)
.grok/reports/                ← WHAT was done (proof + handoff)
```

### `.grok/prompts/` — task library (input to workers)

| What it is | Ready-to-run agent briefs for a **specific slice** of work |
|------------|----------------------------------------------------------|
| Examples | `phase-5b-in-app-chat-mvp-loop.md`, `e2e-03-core-parking-smoke.md`, `feature-tenant-self-service-onboarding.md` |
| Written by | Orchestrator (①) or human when scoping a phase |
| Used by | Workers ②③④ — paste prompt + role starter from §3 |
| Contains | Scope, files allowed, do-not-touch rules, branch name, verification commands, loop protocol |

**When to create a new prompt file:**

- Multi-step phase (e.g. Phase 6 tenant billing) with 3+ PRs
- Repeatable playbook (E2E loops `e2e-00` … `e2e-05`)
- Handoff to a fresh agent session without re-explaining context

**When NOT to create one:** tiny one-file fix → Orchestrator gives a 3-line inline task instead.

**Naming convention:** `phase-Nx-short-name.md`, `fix-short-name.md`, `e2e-NN-description.md`, `feature-short-name.md`

### `.grok/reports/` — completion archive (output from workers + ⑤)

| What it is | Post-merge summary: changes, PR #, verification, known gaps |
|------------|---------------------------------------------------------------|
| Index | [`.grok/reports/README.md`](../../.grok/reports/README.md) — table of all reports |
| Written by | Quality, Architecture & Release (⑤) or the worker who finished the slice |
| Used by | Orchestrator (①) for “do not redo” checks; MASTER_PROMPT changelog |
| Contains | Problem, solution, files touched, test evidence, follow-ups |

**Rule:** Every merged phase PR should have **one report** (or update README index). Link the report in the PR description.

### How roles use both folders

| Step | Role | Action |
|------|------|--------|
| 1. Pick next work | ① Orchestrator | Read `MASTER_PROMPT` Next Up + `.grok/reports/README` |
| 2. Scope mission | ① Orchestrator | Pick or write `.grok/prompts/xxx.md` |
| 3. Execute | ②③④ Worker | Follow prompt + `ROLES.md` §3 starter; self-check `QUALITY_REVIEW.md` |
| 4. Architecture gate | ⑤ Quality, Architecture & Release | Full `QUALITY_REVIEW.md` checklist + CI |
| 5. Close loop | ⑤ → ① | Write `.grok/reports/xxx.md`, update reports README, MASTER_PROMPT changelog |

### Related `.grok/` assets

| Path | Purpose |
|------|---------|
| [`.grok/AGENTS.md`](../../.grok/AGENTS.md) | Coding standards all workers follow |
| [`.grok/e2e/journey-registry.md`](../../.grok/e2e/journey-registry.md) | Cypress journey IDs (J1, J4, …) for Role ⑤ |
| [`.grok/prompts/loop-engineering-prompt.md`](../../.grok/prompts/loop-engineering-prompt.md) | Autonomous multi-PR loop protocol (auto-merge, no idle-wait) |

### CI note (why docs/prompts changes skip service jobs)

Path filter treats `.grok/**` like docs — **backend/frontend/payment CI skips on PR** unless workflow files also changed. Reports and prompts are safe to commit without triggering full service builds.

---

## 9. Cursor / Grok invocation cheat sheet

| Intent | What to say |
|--------|-------------|
| Plan only | "Act as Orchestrator (Role ①). Read MASTER_PROMPT + ROLES.md + .grok/reports/README. Plan [goal]. No code." |
| Run a phase | "Execute .grok/prompts/phase-5b-in-app-chat-mvp-loop.md as Role ②/③ per section headers." |
| After merge | "Role ⑤: write .grok/reports/[name].md and update reports README." |
| Backend | "Act as Core API Agent (Role ②). Branch fix/… Task: …" |
| Frontend | "Act as Experience Agent (Role ③). Branch fix/… Task: …" |
| Payment | "Act as Payments Agent (Role ④). Branch fix/… Task: …" |
| Architecture review | "Act as Role ⑤. Apply docs/agents/QUALITY_REVIEW.md to PR #N. Verdict + checklist." |
| Review (short) | "Act as Quality, Architecture & Release Agent (Role ⑤). Review PR #N." |
| Parallel | "Orchestrator: split [goal]. Launch ② and ③ in parallel on separate branches." |

---

*Last updated: 2026-06-26 · Maintainer: Pratibha Kumar K*