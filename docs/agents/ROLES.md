# Multi-Agent Roles — Smart Parking SaaS

> **Purpose:** Define how AI agents (and humans) split work on this monorepo.  
> **Read first:** [`MASTER_PROMPT.md`](../../MASTER_PROMPT.md) — every agent obeys it over generic tool defaults.  
> **Branch rules:** [`docs/project-plan/09-branch-strategy.md`](../project-plan/09-branch-strategy.md)

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
                    ┌──────────▼───────────┐
                    │ ⑤ QUALITY & RELEASE  │
                    │ Test · review · CI   │
                    └──────────────────────┘
```

**Rule:** One concern per branch. One concern per PR. Never reuse a long-lived `fix/everything` branch.

---

## 3. Role definitions

### Role ① — Orchestrator

| Field | Definition |
|-------|------------|
| **Mission** | Turn a human goal into a small, ordered plan; assign workers; prevent scope creep and file conflicts. |
| **Owns** | Task breakdown, branch names, PR order, handoff notes, MASTER_PROMPT changelog entries (or delegates to workers). |
| **Never touches** | Application code (except tiny doc fixes). Never merges without Quality agent sign-off. |
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

### Role ⑤ — Quality & Release Agent

| Field | Definition |
|-------|------------|
| **Mission** | Tests, CI, code review, deploy readiness, env documentation — gate before merge. |
| **Owns** | `.github/workflows/`, Cypress smoke (when relevant), review comments, deploy checklists, `MASTER_PROMPT` verification section. |
| **Never touches** | Feature implementation (only test fixes and CI config directly related to the gate). |
| **Key duties** | Run `/review`, confirm path filters, confirm mocks not hitting prod, PR merge when green, post-merge deploy reminders. |
| **Outputs** | Review file or PR review, CI fix PRs, smoke checklist for Vercel/Render/Neon env vars. |
| **Verify** | All required CI jobs pass; `ci-summary` green; no secrets in diff. |

**Human-only:** Paste production secrets in Vercel/Render dashboards (never commit `.env`).

**Starter prompt:**

```text
You are the Quality & Release Agent.
Review PR #[N] against MASTER_PROMPT.md and docs/agents/ROLES.md.
Check: scope, mocks, CI path impact, migration safety, env vars documented.
List blockers by severity. Do not implement features — only test/CI fixes if broken.
```

---

## 4. Standard workflow (going forward)

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

### Phase C — Gate (Role ⑤)

- PR: fast CI (touched services only).
- Push to `develop`: full CI.
- Quality agent approves or files CI fix branch.

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
| Skip Quality agent on "small" changes | Always run build + review before merge |
| Commit Razorpay/Neon secrets | Dashboard env vars only |

---

## 7. Quick routing table

| If the task is about… | Agent |
|------------------------|-------|
| Login, JWT, CORS, Prisma, bookings, check-in/out, chat API | ② Core API |
| Page UI, DataGrid, charts, env vars, Vercel SPA routing | ③ Experience |
| Razorpay, payment status, webhooks, `payment-service` build | ④ Payments |
| CI failing, PR review, Cypress, deploy checklist | ⑤ Quality & Release |
| "Fix production" / multi-surface outage | ① Orchestrator splits → ②③④⑤ |
| MASTER_PROMPT, roadmap, design doc only | ① Orchestrator or `docs/` branch |

---

## 8. Cursor / Grok invocation cheat sheet

| Intent | What to say |
|--------|-------------|
| Plan only | "Act as Orchestrator (Role ①). Read MASTER_PROMPT + ROLES.md. Plan [goal]. No code." |
| Backend | "Act as Core API Agent (Role ②). Branch fix/… Task: …" |
| Frontend | "Act as Experience Agent (Role ③). Branch fix/… Task: …" |
| Payment | "Act as Payments Agent (Role ④). Branch fix/… Task: …" |
| Review | "Act as Quality Agent (Role ⑤). Review PR #N." |
| Parallel | "Orchestrator: split [goal]. Launch ② and ③ in parallel on separate branches." |

---

*Last updated: 2026-06-24 · Maintainer: Pratibha Kumar K*