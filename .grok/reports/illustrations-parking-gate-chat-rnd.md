# Illustrations R&D — Parking gate, security check, chat

**Date:** 2026-06-19  
**Branch:** `feature/illustrations-parking-gate-chat`  
**PR:** TBD — cosmetic preview for human review

## Research

| Source | License | Why chosen |
|--------|---------|------------|
| [unDraw](https://undraw.co/license) | MIT | Already approved in `08-design-system.md`; bundled SVGs; `--primary-svg-color` tint |

Alternatives considered:

* **Storyset / Freepik vectors** — attribution or license friction for SaaS resale; rejected.
* **undraw-svg-collection npm** — 1000+ files; project rule is curated subset only; rejected.
* **Hotlinked CDN in production** — no license pin in repo; rejected.

## Curated downloads (7 new SVGs)

| Catalog key | unDraw slug | Use case |
|-------------|-------------|----------|
| `securityCheck` | `security-on_3ykb` | Gate search hero |
| `securityAlert` | `motion-alert_pr1a` | Security inbox empty |
| `gateEntrance` | `knocking-on-the-door_vgly` | Gate check-in/out success |
| `chatSupport` | `work-chat_kw8x` | Support thread picker |
| `customerCare` | `contact-us_s4jn` | User/admin empty inbox |
| `messaging` | `respond_o54z` | Empty message thread |
| `parkingLogistics` | `logistics_8vri` | Reserved for future parking-lot empty states |

Fetch script: `frontend/scripts/fetch-undraw-illustrations.mjs` (re-run to refresh; replaces `#6c63ff` with `var(--primary-svg-color)`).

## UI wiring (preview)

* `/security/gate` — search panel `securityCheck`; success `gateEntrance`
* `/support` (USER) — empty list `customerCare`; select thread `chatSupport`; empty messages `messaging`
* `/security/messages` — empty inbox `securityAlert`; select thread `securityCheck`
* `/admin/support` — defaults `customerCare` / `chatSupport` / `messaging`

## Validation

```bash
cd frontend && npm run build
```

## Review with human

Compare before/after on gate search, gate success, support empty states, and staff inboxes. Revert individual placements if any feel heavy.