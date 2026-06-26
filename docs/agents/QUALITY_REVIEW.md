# Quality, Architecture & Release Review

> **Purpose:** Mandatory gate between worker implementation and merge.  
> **Owner:** Role ⑤ — Quality, Architecture & Release Agent  
> **Companion:** [`ROLES.md`](./ROLES.md) (roles + workflow) · [`.grok/AGENTS.md`](../../.grok/AGENTS.md) (coding standards) · [`docs/project-plan/08-design-system.md`](../project-plan/08-design-system.md)

> This checklist is run by Role ⑤ on **EVERY** worker PR before merge.  
> Mark **N/A** only if zero files in that domain were touched.  
> Every non-N/A section must have an explicit **PASS** or finding.  
> Verdict must be: **APPROVE** · **APPROVE WITH NOTES** · **BLOCK**

---

## How to use

1. Copy [`.grok/agent-runs/TEMPLATE/tasks/quality-release.md`](../../.grok/agent-runs/TEMPLATE/tasks/quality-release.md) into your agent-run folder (`tasks/quality-release.md`).
2. Work through §1–13, marking each item ✅ PASS, ❌ FAIL, or N/A.
3. Set verdict at the top of `tasks/quality-release.md`.
4. **BLOCK** = no merge until fixed and re-reviewed by Role ⑤.
5. **MAJOR** = fix or defer with owner + ticket; **MINOR** = note and merge allowed.

See also: [`.grok/agent-runs/README.md`](../../.grok/agent-runs/README.md) · [`.grok/prompts/TEMPLATE.md`](../../.grok/prompts/TEMPLATE.md)

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
| **BLOCK** | Security, tenant leak, hooks violation, prod URL in tests, secrets in diff, broken build/tests, or MAJOR that risks data inconsistency, crosses service boundary without contract, or exposes credentials | No merge until fixed; re-run Role ⑤ |
| **MAJOR** | Duplicate logic, wrong layer, design-system bypass, missing invalidation, controller bloat, N+1 queries | Fix in PR or defer with owner + ticket |
| **MINOR** | Naming, comment noise, optional refactor | Note in report; merge allowed |
| **NIT** | Style preference | Optional |

A **MAJOR** becomes a **BLOCK** if it: (a) introduces data inconsistency risk, (b) crosses a service boundary without an interface contract, (c) exposes a secret or hardcoded credential.

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

**BLOCK if:** New duplicate DataGrid setup, status chip styling, confirm dialog, or axios client when a shared one exists.

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

**BLOCK if:** Business logic placed in the wrong service or folder; payment secrets in frontend/backend diff.

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

**BLOCK if:** Conditional hook call or hook after early return.

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

**BLOCK if:** Missing `organizationId` filter on new tenant data access; cross-tenant data exposure.

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

**BLOCK if:** Parking/booking logic added to payment-service; live API keys in repo.

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
| Browser console | New/changed pages checked in devtools: **no unexpected `console.error` / `console.warn`** during happy path, empty state, and handled error state |
| Console tests | Public/UX pages add `spyConsoleErrors()` (or equivalent) in Vitest for render + handled API failure paths |
| Public routes | Public pages do not bootstrap `auth/me` with stale tokens; public API calls omit `Authorization` header |
| Schema sync | After Prisma schema PRs, local/prod DB has migration applied before manual UI smoke (`prisma migrate deploy`) |

**BLOCK if:** Secrets in diff; tests hitting production URLs; required CI job failing; public page spams console on handled errors or triggers auth bootstrap noise.

---

### 11. Performance

| Check | Pass criteria |
|-------|---------------|
| N+1 queries | Prisma `include`/`select` intentional; no unbounded relation fan-out in loops |
| Pagination | List endpoints paginated when result sets can grow |
| React Query | Intentional `staleTime`/`gcTime`; document overrides in code or PR |
| Polling | No `refetchInterval` &lt; 2000ms on non-critical data without justification |
| Real-time | Sub-2s freshness → WebSocket/SSE preferred over tight polling |
| NestJS handlers | No synchronous blocking work on request thread |

**MAJOR if:** Obvious N+1 on hot path; unbounded list endpoint without pagination plan.

---

### 12. Future-proofing

| Check | Pass criteria |
|-------|---------------|
| Hardcoded business values | No magic tenant IDs, slot counts, pricing literals in code |
| Feature flags | Unreleased behavior behind flags or env where applicable |
| Migrations | Reversible/additive; enum changes split when PostgreSQL requires commit-before-use |
| Env vars | New `VITE_*` / Render vars in `.env.example` and PR description |
| Contracts | API/payment contract changes documented for downstream agents |

**MAJOR if:** Hardcoded production identifiers or non-reversible migration without Orchestrator approval.

---

### 13. Agent coverage

| Check | Pass criteria |
|-------|---------------|
| Activation table | Every touched domain had a matching specialist agent in `plan.md` |
| Scope compliance | No agent worked outside its defined scope (see `ROLES.md` §3) |
| Parallel safety | Parallel agents produced no conflicting changes (verify `git diff`) |
| Test ownership | ⑨ Testing Agent produced spec files for all new services/components |
| Table accuracy | Activation table matches actual changed files |
| Docs-only | N/A — only ① + ⑤ ran; no writer agents required |

**BLOCK if:** Production code merged without ⑨ specs for new logic; writer modified test files; activation table omits a touched domain.

---

## Review procedure

1. **Scope** — Confirm PR matches one concern and activation table (per `ROLES.md` §2).
2. **Diff walk** — File-by-file against checklist sections §1–13.
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
- [ ] APPROVE
- [ ] APPROVE WITH NOTES
- [ ] BLOCK

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
| 11 Performance | … |
| 12 Future-proofing | … |
| 13 Agent coverage | … |

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

Writers (②③④⑥⑦⑧⑩⑫) run service build; **⑨** runs tests. Workers skim §1–12 for their folder **before** requesting ⑤. Role ⑤ runs the full §1–13 gate.

---

*Last updated: 2026-06-26 · Maintainer: Pratibha Kumar K · §1–13 universal checklist*