# Quality Release — PR #155 Round 2

**Verdict: BLOCK** (pending CI full-stack integration + human UI verification)

## Blockers addressed

| # | Finding | Owner | Status |
|---|---------|-------|--------|
| 1 | Service payment auth | Payment Agent | ✅ JWT service token NestJS + Spring |
| 2 | Edge device credential | IoT Edge | ✅ EDGE_DEVICE_CREDENTIAL required |
| 3 | Gateway topic mismatch | IoT Edge | ✅ Commands target EDGE_GATEWAY |
| 4 | Mocked integration smoke | ⑨ Testing | ✅ Renamed orchestration; full-stack harness added |
| 5 | MQTT publish/ack race | ⑫ Events | ✅ PUBLISHING state + claim/release |
| 6 | Parking + gate reliability | ② Core API | ✅ Payment failure blocks gate; advisory lock |
| 7 | MQTT validation | ⑧ Security | ✅ Payload/clock skew/identifier limits |
| 8 | Replay/dedupe | ⑧ Security | ✅ receivedAt-based dedupe window |
| 9 | Concurrent commands | ② Core API | ✅ pg_advisory_xact_lock |
| 10 | Pre-publish revalidation | ⑧ Security | ✅ Gate/lot/org/device checks |
| 11 | Manual reason whitespace | ③ Experience | ✅ Trim + non-whitespace validation |
| 12 | HTTP relay config | IoT Edge | ✅ Method + auth header env vars |
| 13 | MQTT TLS | ⑦ DevOps | ✅ CA/cert/key path config (backend + edge) |

## Test results (local)

| Suite | Result |
|-------|--------|
| Backend IoT + payment + orchestration | 81 passed |
| iot-edge | 23 passed |
| payment-service JWT tests | 29 passed |
| Full-stack harness | Not run locally (Docker unavailable) — CI job `iot-fullstack-integration` |

## Remaining for APPROVE

- CI `iot-fullstack-integration` green on push
- CI `iot-cypress-smoke` green on PR
- Human UI verification per PR comment