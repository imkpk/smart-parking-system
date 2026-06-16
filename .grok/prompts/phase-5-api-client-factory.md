Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 5 only: API client factory cleanup.

Do not change backend.
Do not change payment-service.
Do not start backend deduplication.
Do not redesign UI.
Do not change table columns.
Do not add new features.

Goal:
Remove duplicate Axios interceptor/client setup and centralize API client creation.

Current issue:
The frontend has separate API clients for:

* Main NestJS backend API
* Spring Boot payment-service API

Different base URLs are correct, but auth header handling and 401 handling should not be duplicated.

Scope:

1. Inspect existing API client files first.

Check files like:

* src/api/client.ts
* src/api/paymentsApi.ts
* any other axios instance usage

2. Create shared API client factory.

Preferred file:
src/api/createApiClient.ts

It should export a function like:

createApiClient(baseURL: string)

The factory should:

* create an axios instance
* attach Authorization Bearer token if token exists
* handle 401 Unauthorized consistently
* preserve existing timeout/settings if any
* preserve existing error behavior as much as possible

3. Refactor main backend API client.

Update existing main API client to use createApiClient.

Example:

* Main backend base URL should continue to be from existing env/config.
* Do not hardcode unless it is already hardcoded.

4. Refactor payment-service API client.

Update payment API client to use createApiClient.

Payment service base URL should remain:
http://localhost:8081/api
or existing env variable if already used.

5. Do not change API function names.

Keep existing exported functions working:

* auth APIs
* vehicles APIs
* bookings APIs
* parking events APIs
* payments APIs
* dashboard APIs
* parking lots/floors/slots APIs

6. Search for direct axios.create usage.

If there are duplicate axios.create calls, replace with createApiClient where appropriate.

7. Search for direct axios imports in pages.

Pages should not directly create axios clients.
Pages should use API files only.

8. Keep behavior unchanged.

Do not change:

* request URLs
* response mapping
* auth behavior
* role behavior
* UI behavior
* table behavior
* search behavior

9. Add small comments only if useful.

Do not over-comment obvious code.

10. Run build.

Run:
cd frontend && npm run build

Manual test:

1. Login as ADMIN.
2. Refresh the page and confirm token still works.
3. Open Dashboard.
4. Open Parking Lots.
5. Open Vehicles.
6. Open Bookings.
7. Open Parking Events.
8. Open Payments.
9. Confirm payment-service calls still work.
10. Logout and confirm auth behavior still works.
11. Force invalid/expired token if easy and confirm 401 behavior is unchanged.

After implementation, show:

1. Files changed
2. Duplicate axios/client code removed
3. Shared createApiClient added
4. API clients updated
5. Build result
6. Manual test steps
7. Any pending issues
