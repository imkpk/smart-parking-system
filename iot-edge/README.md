# IoT Edge Gateway

Minimal Node.js + TypeScript edge service for Smart Parking automatic gate access.

The edge gateway:

- Accepts vendor HTTP detections (`ANPR`, `RFID`, `QR`)
- Normalizes payloads to MQTT detection messages (`schemaVersion: 1`)
- Subscribes to gate command topics
- Executes barrier open commands via `SIMULATED` or `HTTP_RELAY` adapters
- Publishes `RECEIVED` then `EXECUTED` / `FAILED` command acknowledgements
- Emits heartbeat/status over MQTT with reconnect backoff

## Quick start (local)

```bash
# From repo root
docker compose -f docker-compose.iot.yml up -d mosquitto

cd iot-edge
npm install
export EDGE_LOCAL_API_KEY=dev-edge-key
export EXTERNAL_DEVICE_ID=edge-gw-local-001
export ORGANIZATION_ID=1
export GATE_ID=1
npm run dev
```

Health check:

```bash
curl -s http://127.0.0.1:3100/health | jq
```

Post a vendor ANPR detection:

```bash
curl -s -X POST http://127.0.0.1:3100/vendor/anpr \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-edge-key" \
  -d '{"plate":"KA01AB1234","confidence":0.94}'
```

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `EDGE_LOCAL_API_KEY` | yes | — | Protects `/vendor/*` HTTP endpoints |
| `EXTERNAL_DEVICE_ID` | yes | — | Edge device external ID used in MQTT topics |
| `ORGANIZATION_ID` | no | `1` | Tenant organization ID |
| `GATE_ID` | no | `1` | Gate ID |
| `HTTP_PORT` | no | `3100` | Local HTTP server port |
| `MQTT_BROKER_URL` | no | `mqtt://127.0.0.1:1883` | MQTT broker URL |
| `MQTT_USERNAME` | no | — | MQTT username |
| `MQTT_PASSWORD` | no | — | MQTT password |
| `MQTT_CLIENT_ID` | no | derived | MQTT client ID |
| `MQTT_RECONNECT_MIN_MS` | no | `1000` | Reconnect backoff minimum |
| `MQTT_RECONNECT_MAX_MS` | no | `30000` | Reconnect backoff maximum |
| `BARRIER_MODE` | no | `SIMULATED` | `SIMULATED` or `HTTP_RELAY` |
| `HTTP_RELAY_URL` | when `HTTP_RELAY` | — | Relay endpoint for physical barrier |
| `HTTP_RELAY_TIMEOUT_MS` | no | `5000` | Relay HTTP timeout |
| `SIMULATED_BARRIER_DELAY_MS` | no | `250` | Simulated open delay |
| `HEARTBEAT_INTERVAL_MS` | no | `15000` | Status publish interval |
| `COMMAND_DEDUPE_TTL_MS` | no | `300000` | Command dedupe retention |
| `MQTT_TOPIC_PREFIX` | no | `smart-parking` | MQTT topic prefix (matches backend) |
| `FIRMWARE_VERSION` | no | `0.1.0` | Reported firmware version |

## MQTT contract (`schemaVersion: 1`)

Topic base (aligned with backend `MQTT_TOPIC_PREFIX`, default `smart-parking`):

```text
{MQTT_TOPIC_PREFIX}/{organizationId}/{externalDeviceId}
```

| Topic suffix | Direction | Payload |
| --- | --- | --- |
| `/detections` | publish | `DetectionMessage` |
| `/commands` | subscribe | `CommandMessage` |
| `/acks` | publish | `CommandAckMessage` |
| `/heartbeat` | publish | `StatusMessage` |

### Detection publish example

```json
{
  "schemaVersion": 1,
  "messageId": "f8f4d2f2-2f0a-4f0a-9c2f-111111111111",
  "identifierType": "PLATE",
  "identifier": "KA01AB1234",
  "confidence": 0.94,
  "occurredAt": "2026-07-11T10:00:00.000Z",
  "source": "ANPR"
}
```

### Command subscribe example

```json
{
  "schemaVersion": 1,
  "commandId": "cmd-123",
  "action": "OPEN",
  "expiresAt": "2026-07-11T10:00:16.000Z"
}
```

### Command ack lifecycle

1. `RECEIVED` — command accepted and queued for execution
2. `EXECUTED` — barrier open succeeded
3. `FAILED` — expired, relay error, or adapter failure

## HTTP vendor endpoints

All `/vendor/*` routes require header `x-api-key: <EDGE_LOCAL_API_KEY>`.

| Route | Body |
| --- | --- |
| `POST /vendor/anpr` | `{ "plate": "KA01AB1234", "confidence": 0.94, "capturedAt": "..." }` |
| `POST /vendor/rfid` | `{ "tagId": "E200...", "readAt": "..." }` |
| `POST /vendor/qr` | `{ "code": "qr-token", "scannedAt": "..." }` |

`GET /health` is unauthenticated.

## Barrier adapters

- **SIMULATED** — waits `SIMULATED_BARRIER_DELAY_MS` and returns success (local dev/default)
- **HTTP_RELAY** — `POST` to `HTTP_RELAY_URL` with `{ commandId, action: "OPEN" }`

## Development

```bash
npm install
npm run build
npm test
npm run dev
```

## Docker

```bash
docker build -t smart-parking-iot-edge ./iot-edge
```

Optional compose profile (from repo root):

```bash
docker compose -f docker-compose.iot.yml --profile edge up --build
```

## Simulation script

See `../scripts/simulate-iot-gate.sh` for 10 documented local scenarios (health, detections, command ack flow, dedupe, expiry, relay failure, etc.).