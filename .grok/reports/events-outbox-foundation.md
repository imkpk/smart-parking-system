# Events Outbox Foundation

**Branch:** `feat/events-outbox-foundation`  
**PR:** [#145](https://github.com/imkpk/smart-parking-system/pull/145) — ✅ Merged to `develop` (2026-06-26, merge commit `2012716`)  
**PR title:** `feat(events): add transactional outbox foundation`  
**Date:** 2026-06-26  
**Agents:** ① Orchestrator · ⑥ Database · ② Core API · ⑧ Security · ⑨ Testing · ⑤ Quality

---

## Summary

Adds a Postgres-only transactional outbox foundation for future async side effects — no Kafka, RabbitMQ, Redis, or external brokers.

### Delivered

1. **Prisma** — `OutboxEvent` model + `OutboxEventStatus` / `OutboxEventType` enums; migration `20260626220000_outbox_events_foundation`.
2. **`EventsModule`** — `EventPublisherService`, `OutboxWorkerService`, `EventHandlerRegistry`.
3. **Publisher** — `publishEvent()` and `publishEventInTransaction(tx, input)` with JSON payload validation.
4. **Worker** — lifecycle interval polling (5s default), batch locking via `PROCESSING` + `lockedAt`/`lockedBy`, retry backoff, `FAILED` after `maxAttempts`.
5. **Handlers** — noop/logging handlers for all event types (no business side effects yet).
6. **Config** — `OUTBOX_WORKER_ENABLED`, `OUTBOX_WORKER_INTERVAL_MS`, `OUTBOX_WORKER_BATCH_SIZE` documented in `backend/.env.example`.
7. **No public endpoints** — module has zero controllers.

### Out of scope (deferred)

- Wiring check-in, checkout, booking, payment, or notification flows to publish events.
- External message brokers.
- SUPER_ADMIN debug API (skipped — not required for foundation).

---

## Verification

| Command | Result |
|---------|--------|
| `cd backend && npm run prisma:generate` | PASS |
| `cd backend && npm run build` | PASS |
| `cd backend && npm run test:run` | PASS (365 tests) |

---

## Role ⑤ Quality Gate

**Verdict: APPROVE**

| § | Area | Result |
|---|------|--------|
| 1 | Reusable code | PASS — dedicated events module |
| 2 | Service boundaries | PASS — backend only; no payment-service |
| 3 | Design patterns | PASS — publisher/worker/registry separation |
| 4 | React Hooks | N/A |
| 5 | React Query | N/A |
| 6 | MUI / design system | N/A — no frontend |
| 7 | Tenant-aware | PASS — nullable `organizationId` on events |
| 8 | Backend boundaries | PASS — thin module; Prisma data access |
| 9 | Payment-service | N/A — untouched |
| 10 | Tests & CI | PASS — 12 new event tests; full suite green |
| 11 | Performance | PASS — batch + lock; worker disableable |
| 12 | Secrets | PASS — no secrets in payloads/logging |
| 13 | Agent coverage | PASS — DB + API + Security + Testing |

### Acceptance criteria

- [x] `OutboxEvent` table + migration
- [x] `EventPublisherService` creates `PENDING` events
- [x] Transaction-client publishing supported
- [x] Worker processes → `PROCESSED` / retries → `FAILED`
- [x] Worker disableable via env
- [x] No external broker
- [x] No payment-service / frontend changes
- [x] Backend build + tests pass

---

## Merge policy

**Do not squash.** Human merges with merge commit after manual test + CI green.