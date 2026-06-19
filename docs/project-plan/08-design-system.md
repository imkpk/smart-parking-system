# Design System — Governance & License Audit

**Rule:** Agents must **never** blindly download random UI themes, template packs, or CSS kits and paste them into the app.

Every visual or UI dependency must go through: **Research → Verify License → Compare → Apply via controlled design system.**

---

## Mandatory process (before adding any UI asset or library)

```text
1. RESEARCH
   - List 2–3 options that fit React + TypeScript + SaaS admin UI needs
   - Check maintenance, bundle size, and MUI compatibility
   - Prefer extending the existing stack over introducing a parallel system

2. VERIFY LICENSE
   - Confirm license type (MIT, Apache-2.0, OFL, etc.)
   - Confirm commercial SaaS use is allowed
   - Record license in the audit table below
   - Bundled assets go in repo (no production hotlinks)

3. COMPARE
   - Score against: MUI fit, license safety, bundle impact, white-label support, accessibility
   - Document why the winner was chosen and why alternatives were rejected
   - Get human approval before replacing the core UI library

4. APPLY (controlled)
   - Extend frontend/src/theme.ts — do not scatter colors/fonts across pages
   - Add assets only under frontend/src/assets/ with an index/catalog
   - Expose via shared components (Illustration, EmptyState, StatusChip, etc.)
   - Never paste a third-party theme CSS file over the app
   - Never install a full admin template and merge it page-by-page
```

---

## Decision: controlled design system (approved)

We use **one design system** built on MUI — not a downloaded theme.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Component library | **MUI 7** (`@mui/material`) | MIT, enterprise SaaS standard, theming API, DataGrid ecosystem |
| Icons | **MUI Icons** | Same vendor, consistent set, MIT |
| Tables | **MUI X DataGrid** | MIT community tier, already integrated |
| Typography | **Inter** via `@fontsource/inter` | OFL, bundled locally, no Google Fonts CDN dependency |
| Illustrations | **unDraw subset** in `src/assets/illustrations/` | MIT, copied into repo, tintable via `--primary-svg-color` |
| Theme tokens | **`frontend/src/theme.ts`** | Single source: palette, radius, typography, component overrides |
| White-label (future) | Dynamic `createTheme()` per tenant | Phase 2 — override `primary.main`, logo, app name only |

### Alternatives considered and rejected

| Option | Why rejected |
|--------|--------------|
| Random Tailwind admin templates | Parallel styling system; fights MUI; merge pain |
| Shadcn/ui full replacement | Would replace MUI; large rewrite; not needed |
| Creative Tim / ThemeForest dashboards | License unclear or attribution-heavy; paste-and-hope pattern |
| Ant Design | Second component system; inconsistent with existing MUI pages |
| Chakra UI | Same — dual system cost |
| Hotlinked unDraw / external SVG URLs | No license pinning; CDN dependency; rejected for production |
| `undraw-svg-collection` npm (1362 SVGs) | Installed once to source files, then **removed** — only 12 curated SVGs kept |

---

## License audit (current — verified 2026-06-17)

| Asset / package | Version | License | Commercial SaaS | Location | Notes |
|-----------------|---------|---------|-----------------|----------|-------|
| `@mui/material` | ^7.3.11 | MIT | ✅ Yes | package.json | Core UI |
| `@mui/icons-material` | ^7.3.11 | MIT | ✅ Yes | package.json | Icons only |
| `@mui/x-data-grid` | ^9.5.0 | MIT (community) | ✅ Yes | package.json | Tables |
| `@fontsource/inter` | ^5.2.8 | OFL-1.1 | ✅ Yes | package.json + main.tsx | Self-hosted font |
| unDraw illustrations (19 files) | — | MIT ([unDraw license](https://undraw.co/license)) | ✅ Yes | frontend/src/assets/illustrations/ | Curated subset, bundled; +7 gate/chat (2026-06-19) |
| `security-gate-check.jpg` (Magnific preview) | — | **Premium — license pending** | ⚠️ Preview only | `frontend/src/assets/illustrations/` | User-supplied gate search art; verify Magnific/Freepik license before production release |
| `@emotion/react` | ^11.14.0 | MIT | ✅ Yes | package.json | MUI peer |
| `@tanstack/react-query` | ^5.80.7 | MIT | ✅ Yes | package.json | Data fetching |

**Before adding any new row:** complete steps 1–4 above and update this table.

---

## Design tokens (do not invent per page)

Defined in `frontend/src/theme.ts`:

```text
Primary:     #1f6feb
Secondary:   #0f766e
Background:  #f6f8fb (default) / #ffffff (paper)
Radius:      8px (buttons, cards)
Font:        Inter 400/500/600/700
Buttons:     textTransform none, fontWeight 600, no default shadow
```

**Tenant override (Phase 2):** only `primary.main`, logo URL, and display name — not per-page CSS.

---

## Approved extension path

| Need | Approved approach | Not approved |
|------|-------------------|--------------|
| Charts | Add `@mui/x-charts` (MIT) themed via `theme.ts` | Random Chart.js themes |
| Empty states | `EmptyState` + `Illustration` + catalog in `assets/illustrations/index.ts` | Random PNGs from Google |
| Tenant colors | `createTheme(deepmerge(baseTheme, tenantOverrides))` | Per-tenant CSS files |
| New icons | `@mui/icons-material` first | Mixed icon packs |
| Marketing pages | unDraw from approved catalog only | Stock photo watermarks |

---

## Agent checklist (design changes)

```text
[ ] Does this extend theme.ts or a shared component?
[ ] Is the license verified and recorded in the audit table?
[ ] Was a comparison documented (even briefly)?
[ ] Are assets bundled in src/assets/ (not hotlinked)?
[ ] No new CSS framework or admin template introduced?
[ ] EmptyState / StatusChip / PageHeader reused where applicable?
[ ] MASTER_PROMPT.md changelog updated if a new dependency was added?
```

---

## What was done initially (honest audit)

| Action | Followed process? |
|--------|-------------------|
| Kept MUI as sole component system | ✅ Yes — already in project |
| Added Inter via @fontsource | ✅ License verified (OFL), applied via theme + main.tsx |
| Added 12 unDraw SVGs | ⚠️ Partial — MIT, curated, bundled; formal compare doc was missing until now |
| Rejected random theme downloads | ✅ Yes — no themes were pasted in |
| Documented governance | ❌ Was missing — this file fixes that |

---

## Related files

```text
frontend/src/theme.ts
frontend/src/assets/illustrations/index.ts
frontend/src/components/common/Illustration.tsx
frontend/src/components/common/EmptyState.tsx
docs/project-plan/04-design-resources.md
MASTER_PROMPT.md — § Design System Rules
```