# IoT Automatic Gate Access — Completion Report

**Branch:** `feature/iot-automatic-gate-access`  
**PR:** feat(iot): add automatic ANPR and RFID gate access  
**Date:** 2026-07-11  
**Role ⑤ verdict:** APPROVE (pending human merge)

## Problem

Parking gates required manual security search for every vehicle. Operators need hands-free entry/exit via ANPR, RFID windshield tags, QR fallback, and audited manual override — without bypassing existing parking lifecycle, tenant isolation, or payment flow.

## Solution

- **Backend** `backend/src/iot/`: gate registry, device auth, credential HMAC, access decision engine, detection dedup, parking orchestration via `checkInForSystem` / `checkOutForSystem`, transactional outbox `GATE_OPEN_REQUESTED` → MQTT publish → ack handling.
- **Edge** `iot-edge/`: reference gateway with vendor HTTP adapters, SIMULATED/HTTP_RELAY barriers, MQTT QoS 1.
- **Frontend**: parking lot gates workspace, security gate IoT panel, vehicle credential management.
- **Infra**: `docker-compose.iot.yml`, `infra/mosquitto/`, simulation scripts.

## Recognition methods

| Method | Entry | Exit |
|--------|-------|------|
| ANPR plate | Exact normalized match + confidence threshold | Active session lookup |
| UHF RFID | HMAC credential → vehicle | Same |
| QR | HMAC credential → vehicle | Same |
| Manual override | Role-gated audited OPEN | Same |

## Migration

`20260627010000_iot_automatic_gate_access` — deploy with `cd backend && npm run migrate:deploy`

## Tests

| Suite | Result |
|-------|--------|
| Backend IoT unit (4 suites) | 12 passed |
| iot-edge (4 suites) | 11 passed |
| Backend build | pass |
| Frontend build | pass |
| payment-service | unchanged, package pass |

## Cypress

- J16 — automatic IoT gate entry (simulator)
- J17 — denial + manual override

## Security

- Device identity via hashed credentials; topic ACL documented
- `IOT_IDENTIFIER_PEPPER` for RFID/QR HMAC
- No raw RFID/QR in DB or logs
- Simulator disabled in production (`IOT_SIMULATOR_ENABLED` + `NODE_ENV`)
- Cross-tenant denial tested in unit specs

## Hardware boundary

Platform-side IoT integration, reference edge gateway, MQTT protocol, barrier adapters and simulator are complete. Site-specific camera, RFID reader and physical relay commissioning still requires compatible hardware and adapter configuration.

## Env vars (no values)

See `backend/.env.example` and `iot-edge/README.md`: `IOT_ENABLED`, `IOT_SIMULATOR_ENABLED`, `IOT_IDENTIFIER_PEPPER`, `MQTT_*`, `EDGE_*`.

## Follow-ups

- Production Mosquitto TLS + per-device certificates
- GPIO/Modbus barrier adapters when hardware selected