Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 7b only: Payment Status and History Cleanup.

Create a new branch from latest develop:

```bash
git checkout develop
git pull origin develop
git checkout -b refactor/payment-status-history-cleanup
```

Important:
This phase should be done after Phase 7a is merged into develop.
If Phase 7a changes are not present on develop, stop and report:
"Phase 7a must be merged first."

Do not add Razorpay.
Do not add Stripe.
Do not add Strapi.
Do not add real payment gateway.
Do not start Phase 7c.
Do not merge the PR.

Goal:
Clean payment status behavior, payment history behavior, and payment role access so payment records are safe, predictable, and interview-ready.

Scope to inspect first:

Backend:

* backend/src/integrations/payment-service
* backend/src/parking-events
* backend/src/dashboard
* frontend payment API only if response type mismatch is found

Payment service:

* payment-service/src/main/java
* payment controller
* payment service
* payment entity/model
* payment repository
* payment security config
* payment DTOs
* payment tests

Current expected payment statuses:

* INITIATED
* SUCCESS
* FAILED
* REFUNDED

What to clean:

1. Payment status transition rules
2. Payment history/listing behavior
3. Mock success/failure safety
4. Duplicate payment updates
5. Role-based payment visibility
6. Friendly error messages
7. Tests for important payment status flows

ExpectedUNDED

What to clean:

1. Payment status transition rules
2. Payment history/listing behavior
3. Mock success/failure safety
4. Duplicate payment updates
5. Role-based payment visibility
6. Friendly error messages
7. Tests for important payment status transition rules:

* INITIATED can become SUCCESS
* INITIATED can become FAILED
* SUCCESS should not become FAILED through mock failure
* FAILED should not become SUCCESS unless current businessUNDED

What to clean:

1. Payment status transition rules
2. Payment history/listing behavior
3. Mock success/failure safety
4. Duplicate payment updates
5. Role-based payment visibility
6. Friendly error messages
7. Tests for important payment status transition rules:

* INITIATED can become SUCCESS
* INITIATED can become FAILED
* SUCCESS should not become FAILED through mock failure
* FAILED should not become logic intentionally allows retry
* REFUNDED should not be randomly changed by mock success/failure
* Invalid transitions should return a clear error

Role behavior to preserve or clarify:

* ADMIN can view all payments
* USER can view only own payments
* SECURITY can view operational payment transitions should return a clear error

Role behavior to preserve or clarify:

* ADMIN can view all payments
* USER can view only own records if existing behavior allows it
* USER must not see another user's payment records
* Do not loosen access

Rules:

1. Do not change database schema unless absolutely needed.
2. Do not break existing frontend another user's payment records

* Do not loosen access

payments page.
3. Do not change payment initiation behavior from checkout.
4. Do not change JWT another user's payment records

* Do not loosen access

payments page.
3. Do not change payment initiation behavior from/security behavior except to fix payment-specific visibility bugs.
5. Do not expose raw database errors.
6. Do not expose secrets.
7. Keep status.
5. Do not expose raw logic centralized if duplicated.
8. Keep mock success/failure endpoints for portfolio demo.
9. Do not introduce real payment gateway code.
10. Keep code small and focused.

Implementation suggestions:

* Add a small PaymentStatusPolicy/helper if status transition checks are duplicated.
* Add friendly exceptions for invalid payment transitions.
* Make mock success/failure idempotent or safely guarded.
* Ensure list/history endpoints apply correct user scoping.
* Ensure response DTOs use clear fields from Phase 7a.
* Add tests for invalid transitions and access restrictions.

Tests:
Payment service:

* INITIATED → SUCCESS works
* INITIATED → FAILED works
* SUCCESS → FAILED blocked
* FAILED → SUCCESS behavior is either blocked or documented according to current business rule
* USER cannot access another user's payment
* ADMIN can access payments
* SECURITY access remains as currently intended
* Payment history/list endpoints return expected scoped results

Backend:

* checkout still initiates payment
* payment-service response still maps correctly
* payment-service error still handled correctly

Run:

```bash
cd payment-service
mvn clean test
mvn clean package
```

Run:

```bash
cd ../backend
npm run build
npm run test:cov
```

Manual smoke test:

1. Complete checkout and create INITIATED payment.
2. Mock success payment.
3. Try mock failure after success and confirm safe behavior.
4. Create another INITIATED payment.
5. Mock failure payment.
6. Confirm USER sees only own payments.
7. Confirm ADMIN sees all payments.
8. Confirm SECURITY operational payment view still works if supported.
9. Confirm frontend payments page still loads.

Documentation:
Create report:
`.grok/reports/phase-7b-payment-status-history-cleanup.md`

Report must include:

1. Files changed
2. Payment status rules added/cleaned
3. Payment history/access behavior
4. Tests added
5. Build result
6. Manual test result
7. Pending issues

Commit:

```bash
git status
git add .
git commit -m "Clean payment status and history handling"
git push -u origin refactor/payment-status-history-cleanup
```

Open a PR to develop:
Title:
`Clean payment status and history handling`

PR body:

* Summary
* Status rules
* Access behavior
* Validation
* Manual smoke test
* Pending issues

Do not merge the PR.
