# Reusable Agent-Run Infrastructure

## Goal

Transform PR #133 one-off multi-agent setup into permanent reusable scaffolding: prompt template, agent-run template, living index, extended QUALITY_REVIEW §1–12, ROLES updates, MASTER_PROMPT v1.15.0.

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes | Templates, docs, branch, PR |
| ② Core API | No | |
| ③ Experience | No | |
| ④ Payments | No | |
| ⑤ Quality, Architecture & Release | Yes | Self-review + report |

## Allowed paths

```text
docs/agents/
.grok/prompts/
.grok/reports/
.grok/agent-runs/
MASTER_PROMPT.md
```

## Forbidden paths

```text
backend/
frontend/
payment-service/
.github/workflows/
```

## Branch name

`docs/agent-run-infrastructure`

## Scope

1. `.grok/prompts/TEMPLATE.md`
2. `.grok/agent-runs/TEMPLATE/` (README, plan, status, tasks/quality-release.md)
3. `.grok/agent-runs/README.md` — PR #133 as ✅ Merged
4. Extend `docs/agents/QUALITY_REVIEW.md` to §1–12 (merge, do not replace)
5. Update `docs/agents/ROLES.md` — role selection, reject loop, phases, how-to-start
6. Reconcile `2026-06-26-agent-quality-review-flow/` folder
7. `MASTER_PROMPT.md` v1.15.0 changelog (preserve v1.14.0 row)

## Out of scope

- Application code
- CI workflow changes
- Rewriting v1.14.0 changelog history

## Acceptance criteria

- [ ] `.grok/prompts/TEMPLATE.md` with all sections including performance
- [ ] `.grok/agent-runs/TEMPLATE/` complete
- [ ] `QUALITY_REVIEW.md` §1–12 + How to use (merged, not replaced)
- [ ] `ROLES.md` role selection + reject loop + canonical phases + how-to-start
- [ ] `.grok/agent-runs/README.md` with #133 ✅ Merged
- [ ] `MASTER_PROMPT.md` **v1.15.0** new changelog row (v1.14.0 untouched)
- [ ] No `backend/`, `frontend/`, `payment-service/`, `.github/workflows/` changes
- [ ] Report at `.grok/reports/agent-run-infrastructure.md`
- [ ] Row in `.grok/agent-runs/README.md` for this run

## Code quality requirements

N/A — docs-only.

## React Hooks requirements

N/A

## Design-system requirements

N/A

## Backend architecture requirements

N/A

## Payment requirements

N/A

## Performance requirements

N/A — checklist §11 documented in QUALITY_REVIEW for future PRs.

## Build/test commands

```bash
git diff develop --stat
```

## Manual verification steps

1. Copy TEMPLATE folders and confirm placeholders are clear
2. Open QUALITY_REVIEW.md — §11 Performance and §12 Future-proofing present
3. Confirm MASTER_PROMPT version is 1.15.0 with new changelog row only

## Expected report file

`.grok/reports/agent-run-infrastructure.md`