# Multi-Agent Quality & Architecture Review Flow

## Goal

Document the mandatory Quality, Architecture & Release gate between worker PRs and merge. Add `docs/agents/QUALITY_REVIEW.md` and expand `docs/agents/ROLES.md` so Role ⑤ reviews reusable code, duplication, service boundaries, design patterns, React Hooks, React Query, MUI/design-system, tenant architecture, backend boundaries, payment separation, and tests/CI/secrets.

## Role ownership

| Role | Responsibility |
|------|----------------|
| ① Orchestrator | Plan, create prompt, agent-run folder, branch, PR |
| ⑤ Quality, Architecture & Release | Self-review against QUALITY_REVIEW.md, report, MASTER_PROMPT changelog |

No Roles ②③④ — docs-only.

## Allowed paths

```text
docs/agents/
.grok/prompts/
.grok/reports/
.grok/agent-runs/
MASTER_PROMPT.md
Agents.md
```

## Forbidden paths

```text
backend/
frontend/
payment-service/
.github/workflows/   (unless CI doc reference only — do not change workflows)
```

## Branch name

`docs/agent-quality-review-flow`

## Scope

1. Create `docs/agents/QUALITY_REVIEW.md` — 10-section review checklist + verdict template.
2. Update `docs/agents/ROLES.md`:
   - Rename Role ⑤ to Quality, Architecture & Release
   - Wire flow: Orchestrator → Worker → ⑤ → CI → Report → Merge
   - Link `.grok/prompts/` (mission input) and `.grok/reports/` (completion proof)
   - Document Role ⑤ review responsibilities
3. Create this prompt file and agent-run traceability under `.grok/agent-runs/`.
4. Update `MASTER_PROMPT.md` changelog and references.

## Out of scope

- Application code changes
- CI workflow edits
- Merging to `develop` (human or auto-merge after review)

## Acceptance criteria

- [ ] `docs/agents/QUALITY_REVIEW.md` exists with §1–10 checklist
- [ ] `docs/agents/ROLES.md` references prompts, reports, QUALITY_REVIEW, expanded Role ⑤
- [ ] No files changed under `backend/`, `frontend/`, `payment-service/`
- [ ] PR opened to `develop` with title `docs: add quality review rules to multi-agent flow`
- [ ] Role ⑤ verdict APPROVE (docs-only, no blockers)
- [ ] Report stub + README index row prepared

## Implementation notes

- Reuse content patterns from `.grok/AGENTS.md` and `docs/project-plan/08-design-system.md`
- Align tenant/payment boundaries with `docs/project-plan/07-hld-saas-v2.md`
- Supersedes overlapping scope on branch `docs/multi-agent-roles` (PR #132) — close #132 when new PR opens

## Reuse requirements

- Reference existing shared component paths from `.grok/AGENTS.md` in checklist
- Reference `AccessPolicyService`, `SlotLifecycleService` patterns for backend section
- Reference `createApiClient`, `apiEnv.ts` for frontend section

## Code quality requirements

N/A — docs-only. Checklist must encode universal code quality rules for future PRs.

## React Hooks requirements, if frontend is involved

N/A for this task. Checklist §4 documents hooks laws for Role ⑤ on future frontend PRs.

## Design-system requirements, if frontend is involved

N/A for this task. Checklist §6 documents MUI/theme rules for future frontend PRs.

## Backend architecture requirements, if backend is involved

N/A for this task. Checklist §7–8 document NestJS patterns for future backend PRs.

## Payment requirements, if payment-service is involved

N/A for this task. Checklist §9 documents payment-service separation for future PRs.

## Build/test commands

Docs-only — no service builds required. Verification:

```bash
git diff develop --stat
# Confirm only docs/.grok paths changed
```

## Manual verification steps

1. Open `docs/agents/ROLES.md` — confirm Role ⑤ name and workflow diagram
2. Open `docs/agents/QUALITY_REVIEW.md` — confirm 10 sections present
3. Click relative markdown links in both files
4. Confirm `MASTER_PROMPT.md` references QUALITY_REVIEW.md

## Expected report file

`.grok/reports/docs-agent-quality-review-flow.md`