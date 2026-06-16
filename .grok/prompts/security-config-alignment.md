# Security Config Alignment

## Summary

Aligned backend and payment-service development JWT secret fallback values to avoid local integration mismatches between NestJS backend and Spring Boot payment-service.

## Files touched

- backend/README.md
- backend/src/auth/auth.module.ts
- backend/src/auth/strategies/jwt.strategy.ts
- payment-service/README.md
- payment-service/env.example
- payment-service/src/main/resources/application.properties
- payment-service/src/main/resources/application-example.properties

## Reason

Both services validate JWT-based requests during local development. Using inconsistent fallback secrets can cause authentication failures between services even when the flow is otherwise correct.

## Important note

This is a development fallback only. Real production secrets must come from environment variables and must not be committed.

## Validation

- Backend build passed
- Payment-service build passed
- Checkout flow still created INITIATED payment successfully