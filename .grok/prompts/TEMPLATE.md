<!-- TEMPLATE: copy to .grok/prompts/<slug>.md and fill placeholders before starting agent run -->

# [Title]

## Goal

[One paragraph: what must be true when this task is done.]

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes/No | [planning, branch, prompt, agent-run] |
| ② Core API | Yes/No | [backend work] |
| ③ Experience | Yes/No | [frontend work] |
| ④ Payments | Yes/No | [payment-service work] |
| ⑤ Quality, Architecture & Release | Yes | Review gate + report |

## Allowed paths

```text
[List folders/files workers may touch]
```

## Forbidden paths

```text
[List folders workers must not touch]
```

## Branch name

`<type>/<scope>-<slug>`

Types: `feat/` · `fix/` · `docs/` · `refactor/` · `chore/`

## Scope

1. [First deliverable]
2. [Second deliverable]
3. …

## Out of scope

- [Explicit exclusions]

## Acceptance criteria

Role ⑤ must verify before APPROVE:

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] Build/tests pass for touched services (or N/A docs-only)
- [ ] `QUALITY_REVIEW.md` §1–12 reviewed; no BLOCK findings
- [ ] Report at `.grok/reports/<slug>.md`
- [ ] Row added to `.grok/agent-runs/README.md`

## Code quality requirements

- Reuse existing services, helpers, API clients, formatters, hooks, shared components
- No duplicate DataGrid, StatusChip, ConfirmDialog, axios clients, or formatters
- Small focused diff; no drive-by refactors

Or **N/A** for docs-only tasks.

## React Hooks requirements

N/A if no `frontend/` changes. If frontend is touched:

- Hooks only at top level — never inside `if`, loops, callbacks, or event handlers
- Complete dependency arrays; no `eslint-disable` for missing deps without justification
- No derived state stored in `useState` when it can be computed during render
- Extract repeated hook logic into custom hooks only when reuse is real

## Design-system requirements

N/A if no `frontend/` changes. If frontend is touched:

- MUI 7 + theme tokens from `frontend/src/theme.ts` only
- No Tailwind/Shadcn/Ant or downloaded admin templates
- No inline hardcoded hex/px except truly dynamic values
- Reuse `AppDataGrid`, `StatusChip`, `EmptyState`, `PageHeader`, etc.

## Backend architecture requirements

N/A if no `backend/` changes. If backend is touched:

- Thin controllers; business logic in services
- `AccessPolicyService` for tenant/permission scoping
- `SlotLifecycleService` for slot state transitions
- DTO validation; no raw SQL; NestJS module boundaries respected
- OpenAPI updated if public contract changes

## Payment requirements

N/A if `payment-service/` not touched. If payment is touched:

- Payment logic stays in `payment-service/` only
- No payment DB access from NestJS or React
- HTTP contract between NestJS and payment service documented
- `PAYMENT_PROVIDER=MOCK|RAZORPAY`; secrets never in repo

## Performance requirements

- No N+1 Prisma queries; use `include`/`select` intentionally
- List endpoints paginated where result sets can grow
- React Query: intentional `staleTime`/`gcTime`; document overrides
- No `refetchInterval` &lt; 2000ms on non-critical polls without justification
- Real-time updates: prefer WebSocket/SSE for sub-2s freshness; avoid tight polling
- No synchronous blocking work in NestJS request handlers

Or **N/A** for docs-only tasks.

## Build/test commands

```bash
# Backend (if touched)
cd backend && npm run build && npm run test:run

# Frontend (if touched)
cd frontend && npm run build && npm run test:run

# Payment (if touched)
cd payment-service && mvn -B clean package

# Docs-only
git diff develop --stat
```

## Manual verification steps

1. [Step 1]
2. [Step 2]

## Expected report file

`.grok/reports/<slug>.md`