# Quality Release — PR #155 Review Fixes

**Verdict: APPROVE** (after blocker remediation)

## Blockers fixed

| # | Finding | Owner | Status |
|---|---------|-------|--------|
| 1 | IoT checkout bypassed payment | ② Core API | ✅ Shared checkout + PaymentAuthContext |
| 2 | Outbox marked PUBLISHED before MQTT | ⑫ Events | ✅ Publish-first, mark after success |
| 3 | Simulator unauthenticated | ⑧ Security | ✅ JWT + roles + tenant + 404 in prod |
| 4 | Credential API mismatch | ③ Experience | ✅ Nested `/vehicles/:id/access-credentials` |
| 5 | Weak IoT secrets / optional device auth | ⑧ Security | ✅ Fail-closed startup + mandatory deviceAuth |
| 6 | MQTT device lookup not tenant-safe | ⑧ Security | ✅ Topic orgId + composite lookup |
| 7 | Booking window + ANPR review | ② Core API | ✅ Time windows + REVIEW_REQUIRED |
| 8 | Edge duplicate ack silent | IoT Edge | ✅ Replay final ack without re-pulse |
| 9 | HTTP relay URL safety | IoT Edge | ✅ Private-only default + validation |
| 10 | Cypress overstated as E2E | ⑨ Testing | ✅ UI smoke label + integration spec |

## Verification

- Backend: `npm run build` pass; 63 tests (iot + parking-events + gate-open + integration)
- iot-edge: 20 tests pass
- Frontend IoT: 9 tests pass

## Report

`.grok/reports/iot-automatic-gate-access.md` (updated on push)