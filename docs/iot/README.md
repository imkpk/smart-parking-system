# IoT Automatic Gate Access

## Local stack

```bash
docker compose -f docker-compose.iot.yml up -d mosquitto
cd backend && IOT_ENABLED=true IOT_SIMULATOR_ENABLED=true npm run start:dev
cd iot-edge && EDGE_LOCAL_API_KEY=dev-edge-key EXTERNAL_DEVICE_ID=edge-gw-demo-001 npm run dev
cd frontend && npm run dev
```

## Simulation

```bash
./scripts/simulate-iot-gate.sh
```

## Migration

```bash
cd backend && npm run migrate:deploy
cd backend && npm run prisma:demo-seed
```

## Environment

See `backend/.env.example` and `iot-edge/README.md`. Required in production: `IOT_IDENTIFIER_PEPPER`, MQTT TLS credentials, per-device ACLs.

## Hardware boundary

This repo ships the platform integration and reference edge gateway. Site cameras, RFID readers, and physical relays require local adapter configuration (`EDGE_BARRIER_ADAPTER`, vendor HTTP endpoints).