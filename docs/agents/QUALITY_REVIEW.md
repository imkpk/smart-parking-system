# Quality, Architecture & Release Review

> **Purpose:** Mandatory gate between worker implementation and merge.  
> **Owner:** Role ⑤ — Quality, Architecture & Release Agent  
> **Companion:** [`ROLES.md`](./ROLES.md) (roles + workflow) · [`.grok/AGENTS.md`](../../.grok/AGENTS.md) (coding standards) · [`docs/project-plan/08-design-system.md`](../project-plan/08-design-system.md)

---

## Where this fits in the flow

Workers ship features. Role ⑤ ensures the codebase stays **reusable, tenant-safe, and design-system compliant** before CI and merge.

```text
YOU (Product Owner)
        │
        ▼
① ORCHESTRATOR — plan, branch, assign prompt
        │
        ▼
②③④ WORKER — implement in one service folder
        │
        ▼
⑤ QUALITY, ARCHITECTURE & RELEASE — this document
        │   (code quality · architecture · tests · secrets)
        ▼
CI / RELEASE GATE — path-filtered PR CI → full trunk on develop push
        │
        ▼
REPORT — .grok/reports/xxx.md + MASTER_PROMPT changelog
        │
        ▼
MERGE → develop → Vercel / Render / Neon
```

**Rule:** No merge without Role ⑤ sign-off — even for “small” PRs.

---

## Review inputs

Before reviewing, read:

| Source | Why |
|--------|-----|
| PR diff + description | Scope and intent |
| `.grok/prompts/[task].md` (if any) | Allowed paths, verification commands |
| `MASTER_PROMPT.md` | Non-negotiables, anti-patterns |
| `.grok/AGENTS.md` | Shared components, duplication rules |
| `docs/project-plan/07-hld-saas-v2.md` | Service boundaries, tenant model |
| `docs/project-plan/08-design-system.md` | MUI / theme governance |

---

## Severity model

| Level | Meaning | Merge impact |
|-------|---------|--------------|
| **BLOCKER** | Security, tenant leak, hooks violation, prod URL in tests, secrets in diff, broken build/tests | Must fix before merge |
| **MAJOR** | Duplicate logic, wrong layer, design-system bypass, missing invalidation, controller bloat | Fix in PR or immediate follow-up branch named by Orchestrator |
| **MINOR** | Naming, comment noise, optional refactor | Note in review; merge OK if no blockers |
| **NIT** | Style preference | Optional |

---

## Review checklist

Use every section that applies to the PR’s touched paths. Mark **N/A** when a section does not apply.

### 1. Reusable code & duplication

| Check | Pass criteria |
|-------|---------------|
| Shared components used | `AppDataGrid`, `PageHeader`, `StatusChip`, `ConfirmDialog`, `DetailsDrawer`, `EmptyState`, `Illustration` before page-local copies |
| Shared utilities | `formatters.ts`, `roleUtils.ts`, `apiEnv.ts` — not reimplemented inline |
| API clients | Single factory (`createApiClient`) — no new raw Axios instances |
| Types/interfaces | No duplicate DTO shapes across files; extend existing types |
| Extract when repeated | Same column defs, dialog flow, or status-color logic twice → extract or use shared |

**BLOCKER if:** New duplicate DataGrid setup, status chip styling, confirm dialog, or axios client when a shared one exists.

---

### 2. Service & module boundaries

| Layer | Owns | Must not contain |
|-------|------|------------------|
| `frontend/` | UI, hooks, API clients, env URLs | Prisma, payment DB logic, Razorpay secret handling |
| `backend/` | Tenant-scoped REST, Prisma, JWT, checkout **proxy** to payment service | Razorpay keys, payment DB writes, MUI |
| `payment-service/` | Payment records, Razorpay gateway, webhooks | Parking bookings, slot lifecycle, org branding |

**Cross-service rules:**

- NestJS calls payment service over HTTP for initiate/verify — does not embed payment-provider SDK logic.
- Frontend uses `paymentsApiClient` + `VITE_PAYMENT_SERVICE_URL` for payment endpoints.
- Checkout UI may load Razorpay.js; **secrets stay on Render payment service only**.

**BLOCKER if:** Business logic placed in the wrong service or folder; payment secrets in frontend/backend diff.

---

### 3. Design patterns (monorepo)

| Area | Expected pattern |
|------|------------------|
| NestJS | Thin controllers → services → Prisma; presenters for response shape; DTOs + `class-validator` |
| Tenant scoping | `AccessPolicyService` / `buildOrganizationWhere` — not ad-hoc `where` in every method |
| Frontend data | React Query for server state; local `useState` only for UI ephemeral state |
| Frontend API | `src/api/*` modules per domain; components call hooks or query functions, not raw fetch |
| Payment Java | Controller → service → repository/gateway; `PAYMENT_PROVIDER` strategy for MOCK vs RAZORPAY |

**MAJOR if:** Fat controllers, business rules in React components, or tenant filters copy-pasted without `AccessPolicyService`.

---

### 4. React Hooks rules

| Rule | Review |
|------|--------|
| Rules of Hooks | Hooks only at top level of components/custom hooks — never inside `if`, loops, or nested functions |
| Custom hooks | Repeated query+mutation+invalidation logic → extract `useXxx` hook |
| `useEffect` | Used for side effects only — not for data that belongs in `useQuery` |
| Dependencies | Exhaustive deps; no stale closures causing wrong tenant/user data |
| Context | `AuthProvider`, `TenantBrandingProvider` — do not duplicate auth state elsewhere |

**BLOCKER if:** Conditional hook call or hook after early return.

---

### 5. React Query rules

| Rule | Review |
|------|--------|
| Query keys | Stable, hierarchical: `['auth', 'me']`, `['vehicles']`, `['branding', 'current']` — include tenant/user scope when data is tenant-specific |
| Server state | Lists and details use `useQuery` — not `useEffect` + `useState` + manual fetch |
| Mutations | `useMutation` with `onSuccess` → `queryClient.invalidateQueries` for affected keys |
| Auth logout | `removeQueries` for `['auth']` (and branding as needed) — no stale cross-user cache |
| Loading/error | UI handles `isPending` / `isError` — no silent failures |
| Defaults | Respect `QueryClient` defaults in `main.tsx`; override `staleTime` only with reason |

**MAJOR if:** Mutation without cache invalidation causing stale dashboards/tables; fetch duplicated outside React Query.

---

### 6. MUI & design-system compliance

| Rule | Review |
|------|--------|
| Theme tokens | Colors, radius, typography from `frontend/src/theme.ts` — no scattered hex in `sx` |
| No new UI libraries | MUI 7 + MUI X only — no Tailwind/Shadcn/Ant parallel system |
| Tables | `AppDataGrid` patterns; business labels in cells; raw IDs only in details/technical sections |
| Empty states | `EmptyState` + `Illustration` — not bare “No data” text |
| Status | `StatusChip` only — no per-page chip color maps |
| White-label | Branding via `TenantBrandingProvider` / theme — no hardcoded product name on tenant surfaces |
| Assets | SVGs under `src/assets/illustrations/` — no production hotlinks |

See [`docs/project-plan/08-design-system.md`](../project-plan/08-design-system.md).

**MAJOR if:** New inline palette, duplicate status styling, or third-party theme paste.

---

### 7. Tenant-aware architecture

| Check | Pass criteria |
|-------|---------------|
| JWT claims | `organizationId`, `role` used consistently |
| Backend queries | Every tenant-owned read/write scoped via access policy helpers |
| Cross-tenant tests | New endpoints have tests proving tenant A cannot read tenant B |
| SUPER_ADMIN | Explicit null-org behavior documented in code paths — no accidental global leak |
| Frontend | Role gates via `roleUtils` / route guards — USER cannot see other users’ records |
| URLs | No tenant id in URLs unless API contract requires it; prefer JWT scope |

**BLOCKER if:** Missing `organizationId` filter on new tenant data access; cross-tenant data exposure.

---

### 8. Backend service / controller boundaries

| Layer | Responsibility |
|-------|----------------|
| Controller | HTTP mapping, guards, DTO binding, status codes |
| Service | Business rules, transactions, orchestration |
| Prisma | Data access only — no HTTP or UI concerns |
| Presenter | Map entities → API response shape |
| Module | One domain per NestJS module; avoid god services |

| Check | Pass criteria |
|-------|---------------|
| OpenAPI | Route changes reflected in `backend/docs/openapi.yaml` when public contract changes |
| Migrations | Additive, deploy-safe; enum changes split if PostgreSQL requires commit-before-use |
| Errors | Prisma errors mapped — not raw stack traces to client |

**MAJOR if:** Controller contains branching business logic that belongs in a service.

---

### 9. Payment-service separation

| Check | Pass criteria |
|-------|---------------|
| Scope | Payment entity lifecycle, Razorpay order/verify/webhook, mock provider |
| DB | `parking_payment_db` only — no parking lot/slot tables |
| Auth | Accepts JWT from NestJS; does not re-implement full user directory |
| Provider switch | `PAYMENT_PROVIDER=MOCK|RAZORPAY` — no hardcoded provider in code paths |
| Tests | H2 + Mockito + MockMvc — never real Razorpay or Render |
| Java version | **Java 21** on `develop` unless Orchestrator approved JDK upgrade |

**BLOCKER if:** Parking/booking logic added to payment-service; live API keys in repo.

---

### 10. Tests, CI & secrets

| Check | Pass criteria |
|-------|---------------|
| Unit tests | New business logic has tests; mocks only — **no Neon, Render, or Razorpay in CI** |
| Frontend mocks | `vi.mock('@/api/client')` / payment API mocks |
| Path filters | PR touches only expected folders; CI jobs match changed paths |
| `develop` push | All three service jobs run after merge |
| Secrets | No `.env`, API keys, `DATABASE_URL`, Razorpay secret in diff |
| Env docs | New `VITE_*` or Render vars documented in PR or `.env.example` |
| Migrations | `prisma migrate deploy` safe — never `migrate reset` on production path |

**BLOCKER if:** Secrets in diff; tests hitting production URLs; required CI job failing.

---

## Review procedure

1. **Scope** — Confirm PR matches one concern and one primary folder (per `ROLES.md`).
2. **Diff walk** — File-by-file against checklist sections 1–10.
3. **Run or trust CI** — Build + unit tests green; note which jobs ran (path filter).
4. **Architecture pass** — Ask: “If the next agent copies this pattern, does the codebase get better or messier?”
5. **Verdict** — Blockers listed first; link to file:line where possible.
6. **Handoff** — Approve, request changes, or open `fix/review-xxx` for MAJOR items.

---

## Output template

Save optional local copy under `.grok/review/pr{N}review.md` or post as PR review.

```markdown
## Quality & Architecture Review — PR #N

**Reviewer:** Role ⑤
**Branch:** fix/xxx → develop
**Services touched:** frontend | backend | payment-service
**Prompt:** .grok/prompts/xxx.md (or inline)

### Verdict
- [ ] APPROVED
- [ ] CHANGES REQUESTED

### Blockers
- …

### Major
- …

### Minor / nit
- …

### Checklist summary
| Section | Status |
|---------|--------|
| 1 Reusable code / duplication | PASS / FAIL / N/A |
| 2 Service boundaries | … |
| 3 Design patterns | … |
| 4 React Hooks | … |
| 5 React Query | … |
| 6 MUI / design system | … |
| 7 Tenant architecture | … |
| 8 Backend boundaries | … |
| 9 Payment separation | … |
| 10 Tests / CI / secrets | … |

### CI
- Jobs run: …
- Result: …

### Post-merge (if approved)
- [ ] .grok/reports/xxx.md
- [ ] reports README row
- [ ] MASTER_PROMPT changelog
- [ ] Deploy env checklist (Vercel / Render / Neon)
```

---

## Starter prompt (Role ⑤)

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

## When workers should self-check (before requesting review)

Workers ②③④ run service build + tests, then skim sections 1–10 for their folder **before** opening PR. Role ⑤ still runs the full gate — self-check reduces rework.

---

*Last updated: 2026-06-26 · Maintainer: Pratibha Kumar K*