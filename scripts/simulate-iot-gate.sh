#!/usr/bin/env bash
# Smart Parking IoT edge local simulation scenarios.
# Usage:
#   ./scripts/simulate-iot-gate.sh [scenario-number|all]
#
# Prerequisites:
#   docker compose -f docker-compose.iot.yml up -d mosquitto
#   cd iot-edge && EDGE_LOCAL_API_KEY=dev-edge-key EXTERNAL_DEVICE_ID=edge-gw-local-001 npm run dev

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EDGE_URL="${EDGE_URL:-http://127.0.0.1:3100}"
API_KEY="${EDGE_LOCAL_API_KEY:-dev-edge-key}"
ORG_ID="${ORGANIZATION_ID:-1}"
GATE_ID="${GATE_ID:-1}"
DEVICE_ID="${EXTERNAL_DEVICE_ID:-edge-gw-local-001}"
MQTT_HOST="${MQTT_HOST:-127.0.0.1}"
MQTT_PORT="${MQTT_PORT:-1883}"
TOPIC_PREFIX="${MQTT_TOPIC_PREFIX:-smart-parking}"
TOPIC_BASE="${TOPIC_PREFIX}/${ORG_ID}/${DEVICE_ID}"

post_vendor() {
  local path="$1"
  local body="$2"
  curl -sS -X POST "${EDGE_URL}${path}" \
    -H "Content-Type: application/json" \
    -H "x-api-key: ${API_KEY}" \
    -d "${body}"
}

publish_command() {
  local payload="$1"
  if command -v mosquitto_pub >/dev/null 2>&1; then
    mosquitto_pub -h "${MQTT_HOST}" -p "${MQTT_PORT}" -t "${TOPIC_BASE}/commands" -m "${payload}"
    return
  fi

  docker exec smart-parking-mosquitto mosquitto_pub \
    -h 127.0.0.1 -t "${TOPIC_BASE}/commands" -m "${payload}"
}

scenario_1_health() {
  echo "Scenario 1: GET /health"
  curl -sS "${EDGE_URL}/health" | jq .
}

scenario_2_anpr_detection() {
  echo "Scenario 2: POST /vendor/anpr"
  post_vendor "/vendor/anpr" '{"plate":"KA01AB1234","confidence":0.95,"capturedAt":"2026-07-11T10:00:00.000Z"}' | jq .
}

scenario_3_rfid_detection() {
  echo "Scenario 3: POST /vendor/rfid"
  post_vendor "/vendor/rfid" '{"tagId":"E20034120123456789012","readAt":"2026-07-11T10:01:00.000Z"}' | jq .
}

scenario_4_qr_detection() {
  echo "Scenario 4: POST /vendor/qr"
  post_vendor "/vendor/qr" '{"code":"qr-token-demo-001","scannedAt":"2026-07-11T10:02:00.000Z"}' | jq .
}

scenario_5_unauthorized_vendor_call() {
  echo "Scenario 5: unauthorized vendor call (expect 401)"
  curl -sS -o /tmp/iot-edge-unauth.json -w "HTTP %{http_code}\n" \
    -X POST "${EDGE_URL}/vendor/anpr" \
    -H "Content-Type: application/json" \
    -d '{"plate":"NOPE"}' || true
  cat /tmp/iot-edge-unauth.json
  echo
}

scenario_6_command_open_success() {
  echo "Scenario 6: publish OPEN command and expect RECEIVED + EXECUTED acks"
  local cmd_id="sim-cmd-$(date +%s)"
  local payload
  payload=$(cat <<EOF
{"schemaVersion":1,"commandId":"${cmd_id}","action":"OPEN","requestedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","expiresAt":"$(date -u -d '+30 seconds' +%Y-%m-%dT%H:%M:%SZ)"}
EOF
)
  publish_command "${payload}"
  echo "Published command ${cmd_id}. Subscribe to ${TOPIC_BASE}/acks to observe ack flow."
}

scenario_7_duplicate_command() {
  echo "Scenario 7: duplicate commandId should be ignored"
  local cmd_id="sim-dup-cmd"
  local payload
  payload=$(cat <<EOF
{"schemaVersion":1,"commandId":"${cmd_id}","action":"OPEN","requestedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","expiresAt":"$(date -u -d '+30 seconds' +%Y-%m-%dT%H:%M:%SZ)"}
EOF
)
  publish_command "${payload}"
  publish_command "${payload}"
  echo "Published duplicate ${cmd_id} twice. Only one RECEIVED ack should appear."
}

scenario_8_expired_command() {
  echo "Scenario 8: expired command should publish FAILED ack"
  local cmd_id="sim-expired-cmd-$(date +%s)"
  local payload
  payload=$(cat <<EOF
{"schemaVersion":1,"commandId":"${cmd_id}","action":"OPEN","requestedAt":"2026-07-11T09:00:00.000Z","expiresAt":"2026-07-11T09:00:01.000Z"}
EOF
)
  publish_command "${payload}"
  echo "Published expired command ${cmd_id}."
}

scenario_9_status_heartbeat() {
  echo "Scenario 9: observe status heartbeat topic"
  echo "Run in another terminal:"
  echo "  mosquitto_sub -h ${MQTT_HOST} -p ${MQTT_PORT} -t '${TOPIC_BASE}/heartbeat' -v"
}

scenario_10_http_relay_failure() {
  echo "Scenario 10: HTTP_RELAY failure path"
  echo "Restart edge with:"
  echo "  BARRIER_MODE=HTTP_RELAY HTTP_RELAY_URL=http://127.0.0.1:9/unreachable npm run dev"
  echo "Then publish a valid OPEN command and verify FAILED ack with RELAY_UNREACHABLE."
}

run_scenario() {
  case "$1" in
    1) scenario_1_health ;;
    2) scenario_2_anpr_detection ;;
    3) scenario_3_rfid_detection ;;
    4) scenario_4_qr_detection ;;
    5) scenario_5_unauthorized_vendor_call ;;
    6) scenario_6_command_open_success ;;
    7) scenario_7_duplicate_command ;;
    8) scenario_8_expired_command ;;
    9) scenario_9_status_heartbeat ;;
    10) scenario_10_http_relay_failure ;;
    *) echo "Unknown scenario: $1" >&2; exit 1 ;;
  esac
}

main() {
  local target="${1:-all}"
  if [[ "${target}" == "all" ]]; then
    for i in $(seq 1 10); do
      echo
      run_scenario "${i}"
      echo "----------------------------------------"
    done
    return
  fi

  run_scenario "${target}"
}

main "$@"