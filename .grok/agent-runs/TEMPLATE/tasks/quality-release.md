<!-- TEMPLATE: copy this folder to .grok/agent-runs/YYYY-MM-DD-<slug>/ and fill placeholders -->

# Role ⑤ — Quality, Architecture & Release

**PR:** TBD (`<branch>` → `develop`)  
**Prompt:** `.grok/prompts/<slug>.md`

## Verdict

`PENDING` → set to one of: **APPROVE** · **APPROVE WITH NOTES** · **BLOCK**

## Severity rules

| Level | Rule |
|-------|------|
| **MINOR** | Note in report; merge allowed |
| **MAJOR** | Must be fixed OR deferred with owner + ticket before merge |
| **BLOCK** | No merge until resolved; re-run Role ⑤ after fix |

A **MAJOR** becomes a **BLOCK** if it:

1. Introduces data inconsistency risk
2. Crosses a service boundary without an interface contract
3. Exposes a secret or hardcoded credential

## Checklist §1–12

Mark each: ✅ PASS · ❌ FAIL · N/A (only if zero files in that domain touched)

### §1 Reusable code / duplication

- [ ] No logic duplicated that exists in shared components/utils
- [ ] Shared components live in correct paths (`components/common/`, `utils/`, `api/`)

### §2 Service boundaries

- [ ] No cross-module direct imports violating layer rules
- [ ] Cross-service communication uses documented HTTP/contracts

### §3 Design patterns

- [ ] Repository/service pattern; no business logic in controllers
- [ ] Presenters/DTOs used consistently

### §4 React Hooks

- [ ] No conditional hooks; hooks at top level only
- [ ] Complete dependency arrays; no unjustified eslint-disable
- [ ] No derived state in `useState` when computable at render

### §5 React Query

- [ ] Intentional `staleTime` / `gcTime`
- [ ] No `refetchInterval` &lt; 2000ms on non-critical data without justification
- [ ] Mutations invalidate correct query keys

### §6 MUI / design system

- [ ] Theme tokens only; no hardcoded hex/px (except dynamic)
- [ ] No custom CSS unless MUI cannot support the pattern

### §7 Tenant architecture

- [ ] Queries scoped to `organizationId` / tenant context
- [ ] `AccessPolicyService` used for permissions; no hardcoded tenant IDs

### §8 Backend boundaries

- [ ] `SlotLifecycleService` for slot transitions
- [ ] No raw SQL; NestJS module boundaries respected

### §9 Payment separation

- [ ] No payment logic in `backend/` or `frontend/` beyond documented clients
- [ ] Payment-service owns payment DB; HTTP contract only between services

### §10 Tests / CI / secrets

- [ ] No secrets in diff; no hardcoded prod URLs in tests
- [ ] New env vars documented in `.env.example`
- [ ] Tests updated for changed logic

### §11 Performance

- [ ] No N+1 queries; list endpoints paginated where needed
- [ ] Intentional caching; WebSocket/SSE for real-time where sub-2s required
- [ ] No sync blocking in NestJS handlers

### §12 Future-proofing

- [ ] No hardcoded IDs, counts, or pricing literals
- [ ] Feature flags for unreleased behavior where applicable
- [ ] Reversible DB migrations; new env vars in `.env.example`

## Universal checks (never N/A)

| Check | Result |
|-------|--------|
| One role / one concern per PR | |
| Allowed folders only | |
| No unrelated changes | |
| No secrets | |
| No hardcoded prod URLs | |
| Links/imports consistent (`.grok/AGENTS.md`, not root `AGENTS.md`) | |

## Blockers

- (none)

## Majors

- (none)

## Minors

- (none)

## Post-merge actions

- [ ] `.grok/reports/<slug>.md` finalized
- [ ] `.grok/reports/README.md` row added
- [ ] `.grok/agent-runs/README.md` status → ✅ Merged
- [ ] `MASTER_PROMPT.md` changelog entry (new version row — do not rewrite history)
- [ ] Deploy/env checklist if applicable