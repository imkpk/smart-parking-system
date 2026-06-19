# Phase 5A — Security gate DataGrid row height

**Source:** User instruction during PR #99 UI polish (2026-06-19).

## Prompt

> Row height of this security table is a bit less.

## Scope

* Branch: `feature/phase-5a-gate-phone-search-history` (PR #99)
* Page: `/security/gate` — multiple-match `AppDataGrid`
* Use standard app row height (match other DataGrids), not overly compact

## Validation

```bash
cd frontend && npm run build
```

Manual: search phone with multiple matches; confirm rows are comfortably readable on desktop and tablet.

Pushed to PR #99 branch (commit: `fix(frontend): use standard row height on gate matches grid`).