# Transactional Outbox Foundation

## Goal

Add a Postgres-only transactional outbox foundation for future async side effects: `OutboxEvent` schema, `EventPublisherService`, `OutboxWorkerService`, and handler registry. No Kafka, RabbitMQ, Redis, or external brokers. No rewiring of check-in, booking, or payment flows yet.

**PR:** [#145](https://github.com/imkpk/smart-parking-system/pull/145) — open 2026-06-26  
**Report:** `.grok/reports/events-outbox-foundation.md`

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes | Branch, agent-run, PR |
| ② Core API | Yes | `backend/src/events/` module |
| ③ Experience | No | |
| ④ Payments | No | |
| ⑤ Quality, Architecture & Release | Yes | Review gate + report |
| ⑥ Database | Yes | Prisma schema + migration |
| ⑧ Security | Yes | No public outbox endpoints |
| ⑨ Testing | Yes | Publisher/worker specs |

## Agent activation

| Agent | ID | Activated | Reason |
|-------|----|-----------|--------|
| Orchestrator | ① | Yes | Always |
| Database Agent | ⑥ | Yes | `OutboxEvent` model + migration |
| Core API Agent | ② | Yes | Events module services |
| Security Agent | ⑧ | Yes | No unsafe public endpoints |
| Testing Agent | ⑨ | Yes | 12+ event tests |
| Quality Agent | ⑤ | Yes | Always — runs last |

## Allowed paths

```text
backend/prisma/schema.prisma
backend/prisma/migrations/
backend/src/events/
backend/src/app.module.ts
backend/.env.example
.grok/agent-runs/2026-06-26-feat-events-outbox-foundation/
.grok/reports/
MASTER_PROMPT.md
```

## Forbidden paths

```text
frontend/
payment-service/
check-in/checkout/booking/payment flow rewrites
external broker dependencies
```

## Branch name

`feat/events-outbox-foundation`

## Scope

1. **Prisma** — `OutboxEventStatus`, `OutboxEventType` enums; `OutboxEvent` model with `eventId`, nullable `organizationId`, JSON `payload`, status/attempts/locking fields; migration `20260626220000_outbox_events_foundation`.
2. **EventsModule** — Register in `app.module.ts`; zero controllers.
3. **EventPublisherService** — `publishEvent(input)` and `publishEventInTransaction(tx, input)`; JSON payload validation; creates `PENDING` rows.
4. **OutboxWorkerService** — Lifecycle interval polling (5s default); batch lock via `PROCESSING` + `lockedAt`/`lockedBy`; retry backoff; `FAILED` after `maxAttempts`; disable via `OUTBOX_WORKER_ENABLED`.
5. **EventHandlerRegistry** — Noop/logging handlers for all event types (no business side effects).
6. **Config** — `OUTBOX_WORKER_ENABLED`, `OUTBOX_WORKER_INTERVAL_MS`, `OUTBOX_WORKER_BATCH_SIZE` in `backend/.env.example`.
7. **Tests** — Publisher, transaction client, worker process/retry/fail/disable, handler dispatch.
8. **Agent scaffolding** — Run folder, report, MASTER_PROMPT v1.16.6 changelog.

## Out of scope

- Wiring check-in, checkout, booking, payment, or notification flows to publish events
- External message brokers
- SUPER_ADMIN debug API (optional — skipped)
- Frontend changes

## Acceptance criteria

- [ ] `OutboxEvent` table + migration exist
- [ ] `EventPublisherService` creates `PENDING` events
- [ ] Transaction-client publishing supported
- [ ] Worker processes → `PROCESSED`; retries → `FAILED` after max attempts
- [ ] Worker disableable via env; missing env does not crash startup
- [ ] No external broker; no public endpoints
- [ ] No payment-service / frontend changes
- [ ] Backend build + tests pass (365+ tests)
- [ ] Role ⑤ APPROVE; report at `.grok/reports/events-outbox-foundation.md`
- [ ] Row in `.grok/agent-runs/README.md`

## Code quality requirements

- Dedicated `events/` module; publisher/worker/registry separation
- No secrets or sensitive values in payloads/logs

## React Hooks requirements

N/A

## Design-system requirements

N/A

## Backend architecture requirements

- Prisma data access only; thin module boundaries
- Nullable `organizationId` for platform-level events
- Simple lock marker — no distributed locking over-engineering

## Payment requirements

N/A — payment-service untouched.

## Performance requirements

- Batch processing with configurable `OUTBOX_WORKER_BATCH_SIZE`
- Worker disableable for tests and low-traffic deploys
- Index on `[status, nextRunAt]` for efficient polling

## Build/test commands

```bash
cd backend && npm run prisma:generate && npm run build && npm run test:run
```

## Manual verification steps

1. After merge + `npx prisma migrate deploy`: confirm `outbox_events` table exists
2. Start backend — worker logs interval start (when enabled)
3. Table empty until future PRs publish events
4. Set `OUTBOX_WORKER_ENABLED=false` — app starts without processing

## Expected report file

`.grok/reports/events-outbox-foundation.md`

## Original task prompt (2026-06-26)

Read `MASTER_PROMPT.md`, `.grok/AGENTS.md`, `docs/agents/ROLES.md`, and `docs/agents/QUALITY_REVIEW.md` first. Run Phase 0 merge sync.

Branch: `feat/events-outbox-foundation`  
PR title: `feat(events): add transactional outbox foundation`

Workflow: Do not merge; open PR; Role ⑤ APPROVE/BLOCK; human merges with merge commit.

Goal: Free-tier friendly event-driven foundation using existing Postgres (Transactional Outbox). Business code can write events in the same DB transaction; lightweight in-process worker processes them later. Prepares for scalable async side effects without paid infrastructure.

Schema: `OutboxEvent` with `PENDING|PROCESSING|PROCESSED|FAILED` and event types `PARKING_CHECKED_IN`, `PARKING_CHECKED_OUT`, `BOOKING_CREATED`, `BOOKING_CANCELLED`, `PAYMENT_VERIFIED`, `NOTIFICATION_REQUESTED`, `GENERIC`.

Services: `EventPublisherService` (`publishEvent`, `publishEventInTransaction`), `OutboxWorkerService` (5s poll, batch lock, retry, FAILED), `EventHandlerRegistry` (noop handlers only).

Env: `OUTBOX_WORKER_ENABLED`, `OUTBOX_WORKER_INTERVAL_MS`, `OUTBOX_WORKER_BATCH_SIZE`.

Do not rewrite check-in, checkout, booking, payment, or notification flows in this PR.