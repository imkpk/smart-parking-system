# Mosquitto (local IoT dev broker)

This directory contains a **local development** Mosquitto configuration for the Smart Parking IoT edge gateway.

## Start broker only

From repository root:

```bash
docker compose -f docker-compose.iot.yml up -d mosquitto
```

Broker endpoints:

- MQTT TCP: `mqtt://127.0.0.1:1883`
- MQTT WebSocket: `ws://127.0.0.1:9001`

## Optional password authentication (recommended for shared dev machines)

Do **not** commit password files or secrets. Create them locally:

```bash
mkdir -p infra/mosquitto/secrets
docker run --rm -it -v "$PWD/infra/mosquitto/secrets:/mosquitto/config" eclipse-mosquitto:2 \
  mosquitto_passwd -c /mosquitto/config/passwd iot-edge-dev
```

Then update `mosquitto.conf` locally (not committed):

```conf
allow_anonymous false
password_file /mosquitto/config/passwd
```

Mount the secrets directory in `docker-compose.iot.yml` and set edge env vars:

```bash
MQTT_USERNAME=iot-edge-dev
MQTT_PASSWORD=<your-local-password>
```

Add `infra/mosquitto/secrets/` to `.gitignore` if you create it.

## Topic conventions

The edge gateway uses:

```text
smart-parking/{organizationId}/{externalDeviceId}/detections
smart-parking/{organizationId}/{externalDeviceId}/commands
smart-parking/{organizationId}/{externalDeviceId}/acks
smart-parking/{organizationId}/{externalDeviceId}/heartbeat
```

## Quick smoke subscribe

```bash
docker exec -it $(docker compose -f docker-compose.iot.yml ps -q mosquitto) \
  mosquitto_sub -h 127.0.0.1 -t 'smart-parking/#' -v
```