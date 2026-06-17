# Smart Parking SaaS — Project Plan

> **For AI agents:** Start with [`MASTER_PROMPT.md`](../../MASTER_PROMPT.md) at the repo root — then use this folder for deep detail.

This folder holds product direction, architecture, and phased delivery. `MASTER_PROMPT.md` is the live status + rules document agents update after each task.

**Status:** Active — treat all implementation work as production SaaS quality.

## Documents

| # | Document | Purpose |
|---|----------|---------|
| 1 | [Product Vision](./01-product-vision.md) | Who we sell to, what the product is, SaaS priorities |
| 2 | [Architecture](./02-architecture.md) | Multi-tenant model, roles, data isolation, white-label |
| 3 | [Roadmap](./03-roadmap.md) | Phased delivery plan from current state to sellable SaaS |
| 4 | [Design Resources](./04-design-resources.md) | Free UI assets in the repo and how to use them |
| 5 | [Gap Analysis](./05-gap-analysis.md) | What exists today vs. what SaaS requires |
| 6 | [HLD — Current System (v1)](./06-hld-current-system.md) | Original single-tenant diagram (archived) |
| 7 | [HLD — SaaS v2](./07-hld-saas-v2.md) | **Current** multi-tenant architecture + [diagram](./diagrams/hld-saas-v2.svg) |
| 8 | [Design System Governance](./08-design-system.md) | License audit, compare process, controlled theme rules |
| 9 | [Branch Strategy](./09-branch-strategy.md) | **State-of-the-art** trunk-based delivery, PR stacks, SemVer |

## How to use this folder

- **Before starting a feature** — read the relevant plan doc and check the roadmap phase.
- **After completing a phase** — update `05-gap-analysis.md` and mark items done in `03-roadmap.md`.
- **Agent / AI context** — `.grok/AGENTS.md` summarizes rules; this folder holds the full product plan.

## Last updated

2026-06-17