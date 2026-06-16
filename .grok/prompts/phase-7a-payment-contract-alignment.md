Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 7a only: Payment Contract Alignment.

Create a new branch from latest develop:

```bash
git checkout develop
git pull origin develop
git checkout -b refactor/payment-contract-alignment
```

Do not change frontend unless absolutely required by a broken type/contract.
Do not add Razorpay.
Do not add Stripe.
Do not add Strapi.
Do not add real payment gateway.
Do not change database schema unless there is a clear existing mismatch that cannot be solved otherwise.
Do not start Phase 7b or Phase 7c.
Do not merge the PR.

Goal:
Clean and align the existing NestJS backend ↔ Spring Boot payment-service contract.

Current payment flow:
NestJS checkout completes parking event, completes booking, releases slot, calculates fee, then calls Spring Boot payment-service to create an INITIATED payment.

What “clean” means in this phase:

* Same request fields on NestJS and Spring Boot
* Same response fields on Spring Boot and NestJS
* Clear timeout handling
* Clear payment-service-down handling
* Clear Authorization header forwarding
* Consistent payment status values
* No duplicate payment client logic
* Existing behavior preserved

Scope to inspect first:

Backend:

* backend/src/integrations/payment-service
* backend/src/parking-events
* backend/src/bookings
* backend/src/dashboard if payment data is referenced
* backend/.env.example or README if env docs exist

Payment service:

* payment-service/src/main/java
* payment-service/src/main/resources/application.properties
* payment-service/src/main/resources/application-example.properties
* payment-service/README.md
* payment-service/pom.xml

Expected contract fields:
Request from NestJS to payment-service should be clear and consistent:

* bookingId
* parkingEventId
* userId
* amount
* currency
* paymentMethod if currently supported
* vehicleNumber if already needed
* bookingCode if already needed

Response from payment-service should be clear and consistent:

* id
* bookingId
* parkingEventId
* userId
* amount
* currency
* status
* paymentMethod
* paymentReference
* createdAt
* updatedAt if available

Rules:

1. Preserve existing API response shape as much as possible.
2. Do not break checkout response currently used by frontend.
3. Do not change role permissions.
4. Do not loosen authentication.
5. Continue forwarding Authorization header from NestJS to payment-service.
6. PAYMENT_SERVICE_URL must remain env-based.
7. Add timeout handling in NestJS payment client if missing.
8. Payment-service-down should not crash the checkout flow unexpectedly if existing behavior already returns paymentError.
9. Keep existing payment status values:

   * INITIATED
   * SUCCESS
   * FAILED
   * REFUNDED
10. Keep code small and readable.
11. Avoid duplicate DTO/type definitions where one shared local type can be reused.
12. Do not expose secrets in README or reports.

Implementation suggestions:

* Add or refine NestJS request/response interfaces for payment initiation.
* Add or refine Spring Boot request/response DTOs.
* Align naming between both services.
* Add a clear payment client error wrapper in NestJS if missing.
* Add constants/enums where they reduce duplication.
* Keep mock payment success/failure behavior unchanged.

Tests:
Backend:

* payment client success
* payment client service down/timeout
* checkout still completes parking event and returns payment error safely when payment-service fails if current behavior supports that
* checkout still initiates payment successfully when payment-service responds

Payment service:

* initiate payment success
* request validation
* auth still works
* mock success/failure still works

Run:

```bash
cd backend
npm run build
npm run test:cov
```

Run:

```bash
cd ../payment-service
mvn clean test
mvn clean package
```

Manual smoke test:

1. Start backend and payment-service.
2. Create vehicle.
3. Create booking.
4. Check in.
5. Check out.
6. Confirm payment INITIATED is created.
7. Stop payment-service.
8. Repeat checkout scenario if possible and confirm friendly payment error behavior.
9. Confirm no raw stack trace is returned to frontend.

Documentation:
Create report:
`.grok/reports/phase-7a-payment-contract-alignment.md`

Report must include:

1. Files changed
2. Contract fields aligned
3. DTOs/types updated
4. Error handling added or preserved
5. Build result
6. Test result
7. Manual test result
8. Pending issues

Commit:

```bash
git status
git add .
git commit -m "Align payment service contract"
git push -u origin refactor/payment-contract-alignment
```

Open a PR to develop:
Title:
`Align payment service contract`

PR body:

* Summary
* Files changed
* Validation
* Manual smoke test
* Pending issues

Do not merge the PR.
