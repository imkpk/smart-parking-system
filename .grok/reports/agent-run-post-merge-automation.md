# Agent-Run Post-Merge Status Automation

## Summary

GitHub Action updates agent-run index and report status automatically when a PR merges to `develop` — no manual README sync required.

## PRs

| PR | Branch | Status |
|----|--------|--------|
| TBD | `ci/agent-run-post-merge-status` | Open |

## Roles involved

- ① Orchestrator — workflow + script
- ⑤ Quality, Architecture & Release — review

## Files changed

```text
.github/workflows/agent-run-post-merge.yml
scripts/agent-run-post-merge.mjs
docs/agents/ROLES.md
.grok/reports/agent-run-post-merge-automation.md
MASTER_PROMPT.md
```

## What changed

- Workflow triggers on `pull_request` `closed` where `merged == true` (base `develop`)
- Script parses PR body for `.grok/reports/*.md`, updates agent-runs index and report status
- Non-fatal warnings in workflow summary when no matching row/report

## What was intentionally not changed

- `backend/`, `frontend/`, `payment-service/`
- Application code

## Tests/builds run

- Script logic reviewed; runs in GitHub Actions on merge events

## Manual verification

1. Merge a docs PR with agent-run row ⏳ and `Report: .grok/reports/xxx.md` in body
2. Confirm follow-up commit on `develop` from github-actions[bot]
3. Confirm index row shows ✅ Merged

## Follow-ups

- Requires `.grok/agent-runs/README.md` from PR #134 for index updates

## Status

**PR open — pending merge**