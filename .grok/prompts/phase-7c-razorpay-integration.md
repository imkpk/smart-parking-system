Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 7c only: Razorpay Payment Gateway Integration.

Create a new branch from latest develop:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/razorpay-payment-gateway
```

Important:
This phase should be done after Phase 7a and Phase 7b are merged into develop.
If Phase 7a or Phase 7b changes are not present on develop, stop and report:
"Phase 7a and Phase 7b must be merged first."

Do not add Stripe.
Do not add Strapi.
Do not remove mock payment support.
Do not break existing checkout flow.
Do not merge the PR.

Goal:
Add a real payment gateway integration using Razorpay test-mode style flow while keeping the existing mock provider available for local demos and interview testing.

Why Razorpay:
This project is India-focused and Razorpay supports common Indian payment flows like UPI/cards/netbanking. Strapi is not a payment gateway and should not be used.

Provider strategy:
Support configurable provider:

```text
PAYMENT_PROVIDER=MOCK
PAYMENT_PROVIDER=RAZORPAY
```

Default local behavior should remain MOCK unless Razorpay env values are configured.

Required env values:

* PAYMENT_PROVIDER
* RAZORPAY_KEY_ID
* RAZORPAY_KEY_SECRET
* RAZORPAY_CURRENCY=INR
* RAZORPAY_WEBHOOK_SECRET if webhook verification is implemented

Never commit real Razorpay keys.
Only update env.example/README with placeholder values.

Scope to inspect first:

Payment service:

* payment-service/pom.xml
* payment-service/src/main/java
* payment entity/model
* payment controller
* payment service
* payment repository
* security config
* DTOs
* application.properties
* application-example.properties
* README.md

Backend:

* backend/src/integrations/payment-service
* backend checkout flow only if request/response needs minor alignment

Frontend:

* Do not change frontend unless a minimal display field is required by the new response.
* Do not redesign payment UI.

Expected behavior:

1. Checkout still calls NestJS backend.
2. NestJS backend still calls Spring Boot payment-service.
3. Spring Boot payment-service creates a payment record.
4. If PAYMENT_PROVIDER=MOCK:

   * Existing mock INITIATED/SUCCESS/FAILED flow continues working.
5. If PAYMENT_PROVIDER=RAZORPAY:

   * Payment-service creates a Razorpay order.
   * Payment record stores provider details.
   * Payment remains INITIATED until confirmation/callback/verification.
   * Response includes enough data for a future frontend payment page:

     * payment id
     * status
     * amount
     * currency
     * provider
     * gateway order id if available
     * payment reference if available

payment id
- status
-Database/model changes:
Only add fields if required for Razorpay tracking:

* provider
* gatewayOrderId
* gatewayPaymentId
* gatewaySignature
* gatewayStatus
* failureReason

If database schema gatewayPaymentId

* gatewaySignature
* gatewayStatus
* failure changes are needed:
* Keep them minimal.
* Add migration or documented schema update according to current project style.
* Ensure local MySQL works.

Gateway abstraction:
Add a clean Ensure local provider interface/service if useful:

* PaymentGatewayProvider
* MockPaymentGatewayProvider
* RazorpayPaymentGatewayProvider

Rules:

1. Mock provider must continue working.
2. Razorpay provider must be disabled unless env selects it.
3. Tests must not call real Razorpay APIs.
4. Use mocks/stubs for Razorpay unless env selects it.
5. Tests tests.
6. No real secrets in code, tests, reports, README, or logs.
7. Do not expose raw gateway errors to API users.
8. Store useful gateway error internally if needed.
9. Keep existing payment statuses:

   * INITIATED
   * SUCCESS
   * FAILED
   * REFUNDED
10. Keep role/access behavior from Phase 7b.
11. Keep checkout behavior stable.
12. Keep implementation small enough for portfolio clarity.

Razorpay integration tasks:

* Add Razorpay config properties.
* Add provider selection based on PAYMENT_PROVIDER.
* Add Razorpay order creation flow.
* Add friendly error handling if Razorpay config is missing.
* Add verification endpoint only if implementation remains clean and testable.
* If webhook/verification is too large, document it as pending and do not overbuild.

Suggested endpoints if needed:

* Existing initiate payment endpoint should remain.
* Optional verify endpoint:

  * POST /api/payments/verify
* Optional webhook endpoint:

  * POST /api/payments/webhook/razorpay

Do not add endpoints unless needed for a clean minimal Razorpay test-mode flow.

Tests:
Payment service:

* MOCK provider initiate payment still works
* RAZORPAY provider creates gateway order using mocked client
* missing Razorpay config returns friendly error
* gateway failure returns friendly error and does not expose raw stacktrace
* payment record stores provider/order reference
* mock success/failure still works
* existing status/history tests still pass

Backend:

* checkout still works with MOCK provider
* payment-service response still maps correctly
* payment-service error still handled safely

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
MOCK mode:

1. Set PAYMENT_PROVIDER=MOCK.
2. Start backend and payment-service.
3. Create booking.
4. Check in.
5. Check out.
6. Confirm payment INITIATED.
7. Mock success/failure still works.

RAZORPAY mode:

1. Set PAYMENT_PROVIDER=RAZORPAY with test placeholder/local test config.
2. Start services.
3. Initiate payment.
4. Confirm Razorpay order creation path works if test credentials are available.
5. If real test credentials are not available, document that automated mocked tests passed and manual real gateway test is pending.

Documentation:
Update:

* payment-service/README.md
* payment-service/env.example or application-example.properties
* `.grok/reports/phase-7c-razorpay-integration.md`

Report must include:

1. Files changed
2. Provider strategy
3. Env variables added
4. Razorpay behavior
5. Mock provider behavior
6. Build result
7. Test result
8. Manual test result
9. Pending issues

Commit:

```bash
git status
git add .
git commit -m "Add Razorpay payment gateway integration"
git push -u origin feature/razorpay-payment-gateway
```

Open a PR to develop:
Title:
`Add Razorpay payment gateway integration`

PR body:

* Summary
* Provider strategy
* Env variables
* Validation
* Manual smoke test
* Pending issues

Do not merge the PR.
