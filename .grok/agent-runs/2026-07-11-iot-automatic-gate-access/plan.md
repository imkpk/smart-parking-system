# Plan — IoT Automatic Gate Access

## Activation table

| Role | Activated | Files |
|------|-----------|-------|
| ① Orchestrator | Yes | plan, prompts, integration |
| ⑥ Database | Yes | `schema.prisma`, migration |
| ② Core API | Yes | `backend/src/iot/` |
| ⑫ Events | Yes | outbox, MQTT bridge |
| IoT Edge | Yes | `iot-edge/` |
| ③ Experience | Yes | gates UI, security gate |
| ⑧ Security | Yes | HMAC, device auth, tenant |
| ⑦ DevOps | Yes | mosquitto, CI, compose |
| ⑪ Performance | Yes | indexes, dedup |
| ⑨ Testing | Yes | unit + Cypress J16/J17 |
| ⑩ Documentation | Yes | HLD, report, openapi |
| ⑤ Quality | Yes | QUALITY_REVIEW §1–13 |

## Integration order

1. Prisma + migration
2. Backend IoT domain + parking system methods
3. Outbox + MQTT
4. iot-edge + infra
5. Frontend
6. Tests + docs
7. Single PR