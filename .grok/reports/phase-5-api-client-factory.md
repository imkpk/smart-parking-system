# Phase 5 Complete — API Client Factory Cleanup

## 1. Files changed

**New**
- `frontend/src/api/createApiClient.ts`

**Updated**
- `frontend/src/api/client.ts` — main NestJS backend client
- `frontend/src/api/paymentsApi.ts` — payment-service client

## 2. Duplicate axios/client code removed

Inline `axios.create` + interceptor setup removed from `client.ts` and `paymentsApi.ts` (~70 lines of duplicated auth/401 logic).

## 3. Shared createApiClient added

`createApiClient(baseURL)`:
- Creates axios instance with JSON content-type
- Attaches `Authorization: Bearer <token>` from `tokenStorage`
- Dispatches `smart-parking:unauthorized` event on 401
- Returns configured client

## 4. API clients updated

| Client | Base URL |
|--------|----------|
| Main backend | Existing env/config (unchanged) |
| Payment service | `http://localhost:8081/api` or existing env |

All exported API function names and URLs unchanged.

## 5. Build result

`cd frontend && npm run build` — **success** (commit `d8fcea4`)

## 6. Manual test steps

1. Login as ADMIN and refresh — token still works.
2. Open Dashboard, Parking Lots, Vehicles, Bookings, Parking Events, Payments.
3. Confirm payment-service calls still work.
4. Logout — auth behavior unchanged.
5. Expired/invalid token → 401 handling unchanged.

## 7. Pending issues

- Backend deduplication phases (6a–6d) not started yet.
- JWT secret alignment with payment-service documented separately in README/env examples.