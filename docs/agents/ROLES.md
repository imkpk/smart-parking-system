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

## 2. Dynamic multi-agent model

The system no longer assumes exactly five workers. **Role ①** inspects the PR diff at Phase 0 and spins up only the specialist agents whose domains are touched. **Role ⑤** always gates the result — regardless of how many agents ran.

### Key principle — one job per agent

| Agent type | Writes | Never writes |
|------------|--------|--------------|
| Writers (②③④⑥⑦⑧⑩⑪⑫) | Production code / infra / docs in their scope | Tests (⑨ owns tests) |
| ⑨ Testing Agent | `*.spec.ts`, `*.test.ts`, test utils | Production source files |
| ⑤ Quality Agent | Review verdicts, CI/doc fixes for the gate | Feature implementation |
| ① Orchestrator | Plans, prompts, activation tables, branches | Application code |

```text
Work comes in
     ↓
① Orchestrator — git diff → activation table → split if too large
     ↓
┌─────────────────────────────────────────────────────────────┐
│  PARALLEL SPECIALISTS (only those activated)                │
│  ⑥ Database (if schema)   ⑧ Security (if auth)            │
│  ② Core API   ③ Experience   ④ Payments   ⑦ DevOps …      │
└─────────────────────────────────────────────────────────────┘
     ↓
⑨ Testing Agent — writes/updates specs for all implementation above
     ↓
⑤ Quality + Review — reviews code + tests together
     BLOCK → back to relevant writer → fix → ⑤ again
     APPROVE → CI → Report → Merge
```

### Core roles (always present)

| ID | Role | Always active |
|----|------|---------------|
| ① | Orchestrator | Yes — every PR / agent run |
| ⑤ | Quality, Architecture & Release | Yes — every PR; runs **last** |

### Specialist agents (activated on demand)

| ID | Agent | Triggered when PR touches |
|----|-------|---------------------------|
| ② | Core API Agent | `backend/src/` (excluding pure schema-only — see ⑥) |
| ③ | Experience Agent | `frontend/src/` |
| ④ | Payments Agent | `payment-service/src/` |
| ⑥ | Database Agent | `backend/prisma/**`, `schema.prisma`, migrations, seed scripts |
| ⑦ | DevOps / Infra Agent | `.github/workflows/`, `Dockerfile`, `docker-compose*`, `.env.example`, `scripts/` |
| ⑧ | Security Agent | `auth/`, `guards/`, `interceptors/`, JWT, roles, permissions, `*auth*`, `*guard*`, `*permission*` |
| ⑨ | Testing Agent | `**/*.spec.ts`, `**/*.test.ts`, `jest.config*`, `vitest*`, coverage config |
| ⑩ | Documentation Agent | `docs/`, `*.md`, `.grok/`, `README*`, `MASTER_PROMPT.md`, `AGENTS.md` |
| ⑪ | Performance Agent | **Manual only** — ① invokes when N+1, pagination, caching, or WebSocket risk |
| ⑫ | Notification / Event Agent | `events/`, `listeners/`, `subscribers/`, `notification*`, `email*`, `websocket*`, `gateway*` |

**Activation rules:**

- One path can activate **multiple** agents (e.g. `backend/src/auth/` → ② + ⑧).
- **⑥** activates alongside **②** when any Prisma schema or migration file changes.
- **⑪** is never auto-activated — ① must document the reason in `plan.md`.
- If only docs/`.grok` change → **① + ⑤** only (no writers).
- **⑨** runs **after** implementation agents; **⑤** runs **after** ⑨.

### Scaling by load

| Load | Agents active (typical) |
|------|-------------------------|
| Small PR (1 file) | ① + one writer + ⑨ + ⑤ |
| Medium PR (backend + frontend) | ① + ② + ③ + ⑨ + ⑤ |
| Large PR (full stack) | ① + ②③④⑥ + ⑦⑧ + ⑨ + ⑤ |
| Massive PR | ① **splits into sub-PRs**, each with its own pipeline |

### When ① splits a huge feature

```text
Huge feature → ① detects > N files or cross-service scope
     ↓
Sub-PRs (dependency order):
  PR-A: DB schema (⑥)
  PR-B: Backend API (②) — after A merged
  PR-C: Frontend UI (③) — after B merged
Each sub-PR: own ⑨ + ⑤ gate
     ↓
① merges sub-PRs in order
```

**Rule:** One concern per branch. One concern per PR. Never reuse a long-lived `fix/everything` branch.

### Active agents table (required in every `plan.md`)

```markdown
## Active agents this run
| Agent | ID | Reason activated |
|-------|----|------------------|
| Orchestrator | ① | Always |
| Core API Agent | ② | backend/src/parking/ changed |
| Database Agent | ⑥ | schema.prisma changed |
| Testing Agent | ⑨ | After ② completes |
| Quality Agent | ⑤ | Always — runs last |
```

### Role selection guide (quick)

| Task shape | Agents activated |
|------------|------------------|
| Backend only | ① + ② (+ ⑥ if Prisma) + ⑨ + ⑤ |
| Frontend only | ① + ③ + ⑨ + ⑤ |
| Payment only | ① + ④ + ⑨ + ⑤ |
| Auth change | ① + ⑧ + ② + ⑨ + ⑤ |
| CI / workflow only | ① + ⑦ + ⑤ |
| Docs only | ① + ⑩ + ⑤ |
| Full stack | ① + ②③④ (+ ⑥⑦⑧ as paths dictate) + ⑨ + ⑤ |

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
Run git diff origin/develop --name-only; build activation table (§2); assign specialist agents ②–⑫ as needed; always end with ⑨ then ⑤.
Split into subtasks if scope is large; name branches (fix/ or feature/); define merge order.
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
| **Key duties** | Apply `QUALITY_REVIEW.md` §1–13; verify agent activation table (§13); run `/review`; block merge on BLOCK verdict; confirm mocks not hitting prod; post-merge report + env reminders. |
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

### Role ⑥ — Database Agent

| Field | Definition |
|-------|------------|
| **Mission** | Prisma schema, migrations, seeds, PostgreSQL-safe deploy paths. |
| **Owns** | `backend/prisma/` — `schema.prisma`, `migrations/`, `seed.ts`, `demo-seed.ts` |
| **Responsibilities** | Migrations additive and deploy-safe; enum changes split when PostgreSQL requires commit-before-use; no breaking schema without migration; relations and indexes declared in schema |
| **Forbidden** | Business logic, controllers, `frontend/`, `payment-service/` |
| **Hands off to** | ② Core API for service-layer changes the schema requires |

---

### Role ⑦ — DevOps / Infra Agent

| Field | Definition |
|-------|------------|
| **Mission** | CI workflows, containers, env templates, automation scripts. |
| **Owns** | `.github/workflows/`, `Dockerfile`, `docker-compose*`, `.env.example`, `scripts/` |
| **Responsibilities** | Path filters on workflows; no secrets hardcoded; env vars documented; docs/md changes must not trigger test jobs; health checks defined |
| **Forbidden** | `backend/src/`, `frontend/src/`, `payment-service/src/` |
| **Hands off to** | ⑤ for final secrets scan (§10) |

---

### Role ⑧ — Security Agent

| Field | Definition |
|-------|------------|
| **Mission** | Auth, RBAC, guards, JWT, CORS, sensitive-data handling. |
| **Owns** | `backend/src/auth/`, guards, interceptors, JWT config, permission decorators, role enums |
| **Responsibilities** | No unguarded endpoints; roles enforced at controller level; JWT expiry set; no sensitive data in logs; no hardcoded secrets; CORS reviewed |
| **Forbidden** | UI components, migration files, payment processing logic |
| **Hands off to** | ② and ③ after auth contracts are locked; ⑤ for §10 |

---

### Role ⑨ — Testing Agent

| Field | Definition |
|-------|------------|
| **Mission** | Write and maintain tests for code produced by writers — **never production code**. |
| **Owns** | `**/*.spec.ts`, `**/*.test.ts`, Jest/Vitest config, test utilities, mocks, fixtures |
| **Responsibilities** | Every new service/component has a matching spec; no skipped tests without comment; no `console.log` in tests; mocks isolated between tests |
| **Forbidden** | Production source files (read-only access to understand behavior) |
| **Hands off to** | ⑤ for coverage and CI checks (§10, §13) |

**Runs after:** ②③④⑥⑦⑧⑩⑪⑫ complete implementation.

---

### Role ⑩ — Documentation Agent

| Field | Definition |
|-------|------------|
| **Mission** | Docs, prompts, reports, MASTER_PROMPT consistency. |
| **Owns** | `docs/`, `*.md`, `.grok/`, `README*`, `MASTER_PROMPT.md`, `AGENTS.md` |
| **Responsibilities** | No broken links; consistent terminology; phase numbers correct; agent IDs consistent; new agents documented in `ROLES.md` |
| **Forbidden** | All application source code |
| **Hands off to** | ⑤ for final consistency check |

---

### Role ⑪ — Performance Agent (manual)

| Field | Definition |
|-------|------------|
| **Mission** | N+1, caching, pagination, real-time patterns — **only when ① explicitly activates**. |
| **Owns** | Files with heavy queries, React Query hooks, WebSocket handlers, pagination logic |
| **Responsibilities** | N+1 check; `staleTime`/`gcTime` review; pagination on list endpoints; no sync blocking in handlers; slot availability via WebSocket not polling where required |
| **Forbidden** | Schema changes, auth logic |
| **Hands off to** | ⑤ §11 |

---

### Role ⑫ — Notification / Event Agent

| Field | Definition |
|-------|------------|
| **Mission** | Event bus, listeners, notifications, email, WebSocket gateways. |
| **Owns** | Event emitters, listeners, subscribers, notification services, email templates, WebSocket gateways |
| **Responsibilities** | Events through bus only; no direct cross-module notification calls; email templates reviewed; WebSocket rooms scoped to `organizationId` |
| **Forbidden** | Payment processing, auth guards |
| **Hands off to** | ② for backend module wiring |

---

## 4. Standard workflow (going forward)

```text
① Phase 0 diff → activation table
     ↓
Specialists (⑥⑧ first if triggered, then ②③④⑦⑩⑪⑫ in parallel where safe)
     ↓
⑨ Testing Agent (specs for all new code)
     ↓
⑤ Quality review
     ↓
BLOCK? → back to relevant agent → fix → ⑤ again
     ↓
APPROVE → CI → Report → Merge
```

Writers implement production code. **⑨** writes tests. **⑤** reviews **before** merge — not only after CI fails. See [`QUALITY_REVIEW.md`](./QUALITY_REVIEW.md).

### Phase 0 — Orchestrator decision algorithm

Runs at the start of **every** agent run and PR planning session:

```text
Step 1: git fetch origin develop
Step 2: git diff origin/develop --name-only → changed file list
Step 3: Map each file to agent registry (§2) → build active agent list
Step 4: Resolve overlaps by scope rules (forbidden zones in §3)
Step 5: Output activation table in plan.md (required format in §2)
Step 6: Set execution order (parallel vs sequential below)
Step 7: Per activated agent — set allowed/forbidden paths in plan.md
```

### Parallel vs sequential execution

| Order | Agents | Rule |
|-------|--------|------|
| 1 | ⑥ Database | **Before** ② when schema/migrations touched |
| 2 | ⑧ Security | **Before** ② and ③ when auth contracts change |
| 3 | ② ③ ④ ⑦ ⑩ ⑫ | **Parallel** when folders do not overlap |
| 4 | ⑨ Testing | **After** all implementation agents |
| 5 | ⑤ Quality | **Always last** |

```text
Phase 0:  ① Orchestrator — diff scan → activation table
          ↓
Phase 5:  ⑥ Database (if triggered) → schema locked
          ⑧ Security (if triggered) → auth contracts locked
          ↓
Phase 6:  ② Core API  ─────────────────────────────┐
          ③ Experience ─────────────── parallel    │
          ④ Payments (if triggered) ───────────────│
          ⑦ DevOps (if triggered) ───── parallel   │
          ⑩ Docs (if triggered) ─────── parallel   ┘
          ↓
Phase 10: ⑨ Testing — writes/updates specs for all above
          ↓
Phase 13: ⑤ Quality — gates everything (§1–13)
          ↓
          BLOCK? → back to relevant agent → ⑤ again
          APPROVE → CI → Report → Merge
```

### Canonical phase numbering

| Phase | Action | Owner |
|-------|--------|-------|
| 0 | Safety + **merge sync** + **git diff → activation table** | ① |
| 0.5 | Fill active agents table in `plan.md` | ① |
| 1 | Orchestration summary | ① |
| 2 | Create prompt file (from [`TEMPLATE.md`](../../.grok/prompts/TEMPLATE.md)) | ① |
| 3 | Create agent-run folder; add row to [agent-runs README](../../.grok/agent-runs/README.md) | ① |
| 4 | Create agent-run task files | ① |
| 5 | ⑥ Database / ⑧ Security (if activated) | ⑥⑧ |
| 6 | Implementation | Activated writers (②③④⑦⑩⑫…) |
| 10 | Test authoring | ⑨ |
| 13 | Role ⑤ quality review (§1–13) | ⑤ |
| 14 | Report + `MASTER_PROMPT` changelog | ⑤ |
| 15 | Push + open PR | ① |

### How to start a new agent run

0. **Any AI tool:** paste [`.grok/prompts/ai-tool-bootstrap.md`](../../.grok/prompts/ai-tool-bootstrap.md) at session start (Codex, Claude, Cursor, Grok, Copilot, …). Guide: [`AI-TOOL-BOOTSTRAP.md`](./AI-TOOL-BOOTSTRAP.md). No subagents? simulate roles ①→⑨→⑤ in one session.
1. **Phase 0.5:** `git diff origin/develop --name-only` → map to agent registry → fill activation table in `plan.md`
2. Copy [`.grok/agent-runs/TEMPLATE/`](../../.grok/agent-runs/TEMPLATE/) → `.grok/agent-runs/YYYY-MM-DD-<type>-<slug>/`
3. Copy [`.grok/prompts/TEMPLATE.md`](../../.grok/prompts/TEMPLATE.md) → `.grok/prompts/<slug>.md`
4. Fill all placeholders **before** running any phase
5. Add a row to [`.grok/agent-runs/README.md`](../../.grok/agent-runs/README.md) during Phase 3
6. Execute phases 0 → 15 in order; mark ✅ in `status.md` as you go
7. Coding standards: [`.grok/AGENTS.md`](../../.grok/AGENTS.md) (not root `Agents.md`)

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

### Phase B — Execute (Writers ②③④⑥⑦⑧⑩⑫, then ⑨)

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
2. Role ⑤ runs [`QUALITY_REVIEW.md`](./QUALITY_REVIEW.md) checklist (§1–13).
3. Verdict: **APPROVE** | **APPROVE WITH NOTES** | **BLOCK** (BLOCK must be fixed in PR before re-review).
4. After approval + green CI → merge eligible.
5. Push to `develop`: full CI on all three services.

Role ⑤ may file a `fix/review-xxx` branch only for broken CI or test gaps — not feature rework unless Orchestrator assigns it.

### Post-merge status automation (GitHub Actions)

When a PR merges to `develop`, workflow [`.github/workflows/agent-run-post-merge.yml`](../../.github/workflows/agent-run-post-merge.yml) runs automatically:

1. Reads merged PR number, title, branch, and body
2. Finds `.grok/reports/<name>.md` from PR body (if present)
3. Updates [`.grok/agent-runs/README.md`](../../.grok/agent-runs/README.md) row `⏳ In Progress` → `✅ Merged`
4. Updates matching report `Status` and [`.grok/reports/README.md`](../../.grok/reports/README.md)
5. Commits to `develop` as `github-actions[bot]` (warnings only if no match — workflow does not fail)

Script: [`scripts/agent-run-post-merge.mjs`](../../scripts/agent-run-post-merge.mjs). Agent session merge-sync (Phase 0) remains a fallback.

**PR body tip:** include `Report: .grok/reports/<slug>.md` so the workflow finds the report.

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

| If the task is about… | Agent(s) |
|------------------------|----------|
| Login, JWT, CORS, Prisma, bookings, check-in/out, chat API | ② (+ ⑧ if auth) |
| Page UI, DataGrid, charts, env vars, Vercel SPA routing | ③ |
| Razorpay, payment status, webhooks, `payment-service` build | ④ |
| Prisma schema, migrations, seeds | ⑥ → then ② |
| CI workflows, Docker, scripts, `.env.example` | ⑦ |
| Guards, RBAC, permissions, JWT config | ⑧ → then ②③ |
| Unit/integration specs, Vitest/Jest config | ⑨ (after writers) |
| MASTER_PROMPT, roadmap, agent docs | ⑩ |
| N+1, pagination, WebSocket performance | ⑪ (manual) + ⑤ §11 |
| Events, notifications, email, WebSocket gateways | ⑫ |
| CI failing, PR review, architecture audit | ⑤ |
| "Fix production" / multi-surface outage | ① splits → specialists → ⑨ → ⑤ |

---

## 8. How `.grok/prompts` and `.grok/reports` fit in

These folders existed **before** `ROLES.md`. They are not replaced by the dynamic registry — they **feed** it.

```text
MASTER_PROMPT.md              ← laws (always read)
docs/agents/ROLES.md          ← dynamic agent registry + routing (①–⑫)
docs/agents/QUALITY_REVIEW.md ← how to gate before merge (Role ⑤ §1–13)
.grok/AGENTS.md               ← how to code (standards — canonical)
.grok/prompts/TEMPLATE.md     ← copy for new missions
.grok/prompts/                ← WHAT to do next (executable missions)
.grok/agent-runs/TEMPLATE/    ← copy for new run traceability
.grok/agent-runs/README.md    ← living index of all runs
.grok/reports/                ← WHAT was done (proof + handoff)
```

### `.grok/prompts/` — task library (input to workers)

| What it is | Ready-to-run agent briefs for a **specific slice** of work |
|------------|----------------------------------------------------------|
| Examples | `phase-5b-in-app-chat-mvp-loop.md`, `e2e-03-core-parking-smoke.md`, `feature-tenant-self-service-onboarding.md` |
| Written by | Orchestrator (①) or human when scoping a phase |
| Used by | Activated specialists — paste prompt + role starter from §3 |
| Contains | Scope, files allowed, do-not-touch rules, branch name, verification commands, loop protocol |

**When to create a new prompt file:**

- Multi-step phase (e.g. Phase 6 tenant billing) with 3+ PRs
- Repeatable playbook (E2E loops `e2e-00` … `e2e-05`)
- Handoff to a fresh agent session without re-explaining context

**When NOT to create one:** tiny one-file fix → Orchestrator gives a 3-line inline task instead.

**Naming convention:** `phase-Nx-short-name.md`, `fix-short-name.md`, `e2e-NN-description.md`, `feature-short-name.md`, `docs-short-task.md`

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
| 3. Execute | Activated writers + ⑨ | Follow prompt + `ROLES.md` §3; writers skip tests; ⑨ writes specs |
| 4. Architecture gate | ⑤ Quality, Architecture & Release | Full `QUALITY_REVIEW.md` checklist + CI |
| 5. Close loop | ⑤ → ① | Write `.grok/reports/xxx.md`, update reports README, MASTER_PROMPT changelog |

### Related `.grok/` assets

| Path | Purpose |
|------|---------|
| [`.grok/AGENTS.md`](../../.grok/AGENTS.md) | Coding standards all workers follow |
| [`.grok/e2e/journey-registry.md`](../../.grok/e2e/journey-registry.md) | Cypress journey IDs (J1, J4, …) for Role ⑤ |
| [`.grok/prompts/loop-engineering-prompt.md`](../../.grok/prompts/loop-engineering-prompt.md) | Autonomous multi-PR loop protocol (auto-merge, no idle-wait) |
| [`.grok/agent-runs/README.md`](../../.grok/agent-runs/README.md) | Living index of all agent runs |
| [`.grok/agent-runs/TEMPLATE/`](../../.grok/agent-runs/TEMPLATE/) | Copy for every new run |
| [`.grok/prompts/TEMPLATE.md`](../../.grok/prompts/TEMPLATE.md) | Copy for every new mission prompt |
| [`.grok/prompts/ai-tool-bootstrap.md`](../../.grok/prompts/ai-tool-bootstrap.md) | Universal session opener — paste into any AI tool |
| [`AI-TOOL-BOOTSTRAP.md`](./AI-TOOL-BOOTSTRAP.md) | Tool mapping, single-agent mode, Codex quick start |

### CI note (why docs/prompts changes skip service jobs)

Path filter treats `.grok/**` like docs — **backend/frontend/payment CI skips on PR** unless workflow files also changed. Reports and prompts are safe to commit without triggering full service builds.

---

## 9. AI tool invocation cheat sheet (any tool)

**Session opener (all tools):** paste [`.grok/prompts/ai-tool-bootstrap.md`](../../.grok/prompts/ai-tool-bootstrap.md) + your task. Full guide: [`AI-TOOL-BOOTSTRAP.md`](./AI-TOOL-BOOTSTRAP.md).

| Intent | What to say |
|--------|-------------|
| New session (Codex / Claude / generic) | Paste `ai-tool-bootstrap.md` + `Task: [goal]` or `Execute prompt: .grok/prompts/<slug>.md` |
| Plan only | "Act as Orchestrator (Role ①). Read MASTER_PROMPT + ROLES.md + .grok/reports/README. Plan [goal]. No code." |
| Run a phase | "Execute .grok/prompts/phase-5b-in-app-chat-mvp-loop.md as Role ②/③ per section headers." |
| After merge | "Role ⑤: write .grok/reports/[name].md and update reports README." |
| Backend | "Act as Core API Agent (Role ②). Branch fix/… Task: …" |
| Frontend | "Act as Experience Agent (Role ③). Branch fix/… Task: …" |
| Payment | "Act as Payments Agent (Role ④). Branch fix/… Task: …" |
| Architecture review | "Act as Role ⑤. Apply docs/agents/QUALITY_REVIEW.md to PR #N. Verdict + checklist." |
| Review (short) | "Act as Quality, Architecture & Release Agent (Role ⑤). Review PR #N." |
| Parallel | "Orchestrator: split [goal]. Launch ② and ③ in parallel on separate branches." |
| Dynamic scaling | "Act as Orchestrator (①). Run git diff origin/develop --name-only. Build activation table per ROLES.md §2." |
| Testing only | "Act as Testing Agent (⑨). Write specs for [feature]. Do not modify production source." |

### CI — agent activation summary

Workflow [`.github/workflows/agent-activation-summary.yml`](../../.github/workflows/agent-activation-summary.yml) posts a PR comment listing which agents would be activated for the changed files — use it to verify ①'s activation table matches the diff.

---

*Last updated: 2026-06-27 · Maintainer: Pratibha Kumar K · Dynamic agent registry ①–⑫ · Tool-agnostic via AI-TOOL-BOOTSTRAP.md*