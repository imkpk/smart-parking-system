# IoT Automatic Gate Access — Completion Report

**Branch:** `feature/iot-automatic-gate-access`  
**PR:** [#155](https://github.com/imkpk/smart-parking-system/pull/155)  
**Date:** 2026-07-11  
**Role ⑤ verdict:** APPROVE

## Problem

Parking gates required manual security search for every vehicle. Operators need hands-free entry/exit via ANPR, RFID windshield tags, QR fallback, and audited manual override — without bypassing existing parking lifecycle, tenant isolation, or payment flow.

## Solution

- **Backend** `backend/src/iot/`: gate registry, device auth, credential HMAC, access decision engine, detection dedup, parking orchestration via shared checkout transaction, transactional outbox `GATE_OPEN_REQUESTED` → MQTT publish → ack handling.
- **Edge** `iot-edge/`: reference gateway with vendor HTTP adapters, SIMULATED/HTTP_RELAY barriers, MQTT QoS 1, duplicate ack replay.
- **Frontend**: parking lot gates workspace, security gate IoT panel, vehicle credential management aligned to nested API.
- **Infra**: `docker-compose.iot.yml`, `infra/mosquitto/`, simulation scripts.

## Review blocker resolutions

| # | Blocker | Resolution |
|---|---------|------------|
| 1 | IoT checkout bypassed payment | Shared `executeCheckOutTransaction` + `initiateCheckoutPayment` with `PaymentAuthContext` (user vs system) |
| 2 | Outbox marked PUBLISHED before MQTT | Publish MQTT first; `markCommandPublished` only after successful callback |
| 3 | Simulator unauthenticated | JWT + RolesGuard + tenant checks; 404 when disabled or `NODE_ENV=production` |
| 4 | Credential API mismatch | Nested `/api/vehicles/:vehicleId/access-credentials/*`; server-side QR generation |
| 5 | Weak IoT secrets / optional device auth | `validateIotSecrets()` fail-closed startup; mandatory `deviceAuth` |
| 6 | MQTT device lookup not tenant-safe | Topic `{prefix}/{orgId}/{deviceId}/{channel}`; composite lookup |
| 7 | Booking window + ANPR review | `IOT_BOOKING_EARLY_ENTRY_MINUTES` / `IOT_BOOKING_EXIT_GRACE_MINUTES`; low confidence → `REVIEW_REQUIRED` |
| 8 | Edge duplicate ack silent | `command-state.ts` replays final ack without re-pulse |
| 9 | HTTP relay URL safety | Private-only default + URL validation |
| 10 | Cypress overstated as E2E | J16/J17 relabeled UI smoke; `iot-gate-lifecycle.integration.spec.ts` added |

## Credential API (final contract)

```
GET  /api/vehicles/:vehicleId/access-credentials
POST /api/vehicles/:vehicleId/access-credentials/rfid
POST /api/vehicles/:vehicleId/access-credentials/qr
POST /api/vehicles/:vehicleId/access-credentials/:credentialId/revoke
```

## Recognition methods

| Method | Entry | Exit |
|--------|-------|------|
| ANPR plate | Exact normalized match + confidence threshold | Active session lookup |
| UHF RFID | HMAC credential → vehicle | Same |
| QR | HMAC credential → vehicle | Same |
| Manual override | Role-gated audited OPEN (reason required) | Same |

## Migration

`20260627010000_iot_automatic_gate_access` — deploy with `cd backend && npm run migrate:deploy`

## Tests

| Suite | Command | Result |
|-------|---------|--------|
| Backend IoT + parking + gate-open + integration | `cd backend && npm run test:run -- --testPathPattern="iot\|parking-events\|gate-open\|iot-gate-lifecycle"` | 63 passed |
| iot-edge | `cd iot-edge && npm test` | 20 passed |
| Frontend IoT UI | `cd frontend && npm run test:run -- vehicleCredentials SecurityGateIot ParkingLotGates` | 9 passed |
| Backend build | `cd backend && npm run build` | pass |
| Frontend build | `cd frontend && npm run build` | pass |
| payment-service | `cd payment-service && mvn -B clean package -DskipTests` | pass |

## Cypress

- J16 — IoT gate entry UI smoke (simulator mocks)
- J17 — denial + manual override UI smoke

## Security

- Device identity via hashed credentials; topic ACL documented
- `IOT_IDENTIFIER_PEPPER` and `IOT_DEVICE_CREDENTIAL_PEPPER` required when `IOT_ENABLED=true`
- No raw RFID/QR in DB or logs
- Simulator requires auth + TENANT_ADMIN | ADMIN | SECURITY; disabled in production
- Cross-tenant denial tested in unit and integration specs
- MQTT topic organization binding; never trust payload org ID

## Hardware boundary

Platform-side IoT integration, reference edge gateway, MQTT protocol, barrier adapters and simulator are complete. Site-specific camera, RFID reader and physical relay commissioning still requires compatible hardware and adapter configuration.

## Env vars (no values)

See `backend/.env.example` and `iot-edge/README.md`: `IOT_ENABLED`, `IOT_SIMULATOR_ENABLED`, `IOT_IDENTIFIER_PEPPER`, `IOT_DEVICE_CREDENTIAL_PEPPER`, `IOT_BOOKING_EARLY_ENTRY_MINUTES`, `IOT_BOOKING_EXIT_GRACE_MINUTES`, `PAYMENT_SERVICE_SYSTEM_TOKEN`, `MQTT_*`, `EDGE_*`, `EDGE_BARRIER_ALLOW_PUBLIC`.

## Follow-ups

- Production Mosquitto TLS + per-device certificates
- GPIO/Modbus barrier adapters when hardware selected