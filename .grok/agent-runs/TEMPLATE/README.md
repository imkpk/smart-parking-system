<!-- TEMPLATE: copy this folder to .grok/agent-runs/YYYY-MM-DD-<slug>/ and fill placeholders -->

# Agent Run: YYYY-MM-DD — [Short task name]

## Inferred goal

[One sentence goal.]

## Selected prompt

[`.grok/prompts/<slug>.md`](../../prompts/<slug>.md)

## Required roles

| Role | Used | Reason |
|------|------|--------|
| ① Orchestrator | Yes/No | [planning, prompt, branch, PR] |
| ② Core API | Yes/No | [backend scope] |
| ③ Experience | Yes/No | [frontend scope] |
| ④ Payments | Yes/No | [payment scope] |
| ⑤ Quality, Architecture & Release | Yes | Review + report |

## Branches

| Branch | Purpose |
|--------|---------|
| `<type>/<slug>` | [concern] |

## Merge order

1. `<branch>` → `develop` (squash recommended)

## PR links

| PR | Title | Status |
|----|-------|--------|
| TBD | [title] | ⏳ In Progress |

## Current status

| Phase | Status |
|-------|--------|
| 0 Safety check | ⏳ |
| 1 Orchestration | ⏳ |
| 2 Prompt | ⏳ |
| 3 Agent-run folder | ⏳ |
| 4 Task files | ⏳ |
| 5 Branch | ⏳ |
| 6 Implementation | ⏳ |
| 13 Role ⑤ review | ⏳ |
| 14 Report + changelog | ⏳ |
| 15 Push + PR | ⏳ |

## Human actions required

- [ ] Review and merge PR when Role ⑤ APPROVE + CI green
- [ ] [Env/deploy steps if any]