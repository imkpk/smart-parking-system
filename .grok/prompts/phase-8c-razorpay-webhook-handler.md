Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 8c only: Razorpay Webhook Handler.

Create a new branch from latest develop:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/phase-8c-razorpay-webhook-handler
```

Important:
Phase 8a and Phase 8b must already be merged into develop.

This phase depends on:

* Razorpay provider fields
* Razorpay payment verification endpoint
* Frontend Razorpay checkout UI
* Payment status policy from Phase 7b

If Phase 8a or Phase 8b is missing, stop and report:
"Phase 8a and Phase 8b must be merged first."

Do not change frontend.
Do not add refund flow.
Do not remove MOCK provider.
Do not change checkout flow.
Do not commit real Razorpay keys.
Do not expose Razorpay secrets.
Do not merge the PR.

Goal:
Add Razorpay webhook support in payment-service so Razorpay can confirm payment status server-to-server.

Why:
Frontend verification handles browser success callback, but webhook is the reliable backend confirmation path when:

* user closes browser
* callback fails
* network drops
* payment succeeds but frontend does not call verify

Scope:
Payment service only unless documentation files need updates.

Inspect:

* `payment-service/src/main/java/com/smartparking/payment/controller`
* `payment-service/src/main/java/com/smartparking/payment/service/PaymentService.java`
* `payment-service/src/main/java/com/smartparking/payment/gateway`
* `payment-service/src/main/java/com/smartparking/payment/model/Payment.java`
* `payment-service/src/main/java/com/smartparking/payment/config/PaymentProviderProperties.java`
* `payment-service/src/main/java/com/smartparking/payment/exception`
* `payment-service/src/test/java`
* `payment-service/README.md`
* `payment-service/src/main/resources/application-example.properties`

Expected endpoint:
`POST /api/payments/webhook/razorpay`

Important security rule:
This endpoint should not require normal JWT user authentication because Razorpay calls it directly.
Instead, it must verify Razorpay webhook signature.

Expected header:
`X-Razorpay-Signature`

Expected config:

* `payment.razorpay.webhook-secret`
* env equivalent: `RAZORPAY_WEBHOOK_SECRET`

Do not reuse `RAZORPAY_KEY_SECRET` as webhook secret unless the current project intentionally documents that.
Prefer separate webhook secret.

Webhook signature verification:

* Verify HMAC SHA256 signature using the raw request body and webhook secret.
* Do not verify against parsed/reformatted JSON.
* Use constant-time comparison.
* Never log the full secret or full signature.
* Return friendly error for invalid signature.

Suggested supported events:
Handle minimal useful events only:

* `payment.captured` → mark matching payment SUCCESS
* `payment.failed` → mark matching payment FAILED with failure reason if available

Do not overbuild:

* Do not implement refunds.
* Do not implement all Razorpay events.
* Do not create a large event processing framework.
* Do not add queue/event bus.

Payment matching strategy:
Use one or more available fields from the webhook payload:

* `order_id` should match stored `gatewayOrderId`
* `payment_id` can be stored as `gatewayPaymentId` / `providerReference`
* amount/currency can be validated if available and easy

Expected behavior:

1. Receive webhook request.
2. Verify signature.
3. Parse event type.
4. For `payment.captured`:

   * find payment by `gatewayOrderId`
   * if payment is INITIATED, mark SUCCESS
   * save gateway payment id/provider reference
   * set gatewayStatus to captured
   * be idempotent if already SUCCESS
5. For `payment.failed`:

   * find payment by `gatewayOrderId`
   * if payment is INITIATED, mark FAILED
   * save gateway payment id/provider reference if available
   * save friendly failure reason
   * be idempotent if already FAILED
6. Unknown events:

   * return success/ignored response
   * do not fail the whole webhook
7. Invalid signature:

   * return 400 or 401 with friendly message
8. Missing webhook secret:

   * return friendly config error
9. Missing matching payment:

   * return friendly error or ignored response, whichever is safer and documented
10. Do not expose raw gateway payload errors to users.

Status policy:
Respect existing Phase 7b status rules:

* INITIATED → SUCCESS allowed
* INITIATED → FAILED allowed
* SUCCESS → SUCCESS idempotent
* FAILED → FAILED idempotent
* SUCCESS → FAILED blocked or ignored safely
* FAILED → SUCCESS blocked or ignored safely
* REFUNDED should not be changed

Testing:
Add unit/integration tests for:

* valid `payment.captured` webhook marks INITIATED payment SUCCESS
* valid `payment.failed` webhook marks INITIATED payment FAILED
* invalid signature is rejected
* missing webhook secret returns friendly config error
* unknown event is ignored safely
* already SUCCESS captured webhook is idempotent
* already FAILED failed webhook is idempotent
* SUCCESS payment cannot be changed to FAILED
* FAILED payment cannot be changed to SUCCESS
* MOCK provider payment is not wrongly updated by Razorpay webhook
* raw secret/signature not exposed in error response

Implementation notes:

* Add a webhook request handler that can access raw request body.
* If Spring MVC raw body handling is needed, use `@RequestBody String rawBody`.
* Parse JSON after signature verification.
* Keep DTOs small.
* Add a small `RazorpayWebhookVerifier` or reuse/extend existing signature verifier cleanly.
* Avoid circular dependencies.

Run:

```bash
cd payment-service
mvn clean test
mvn clean package
```

Run backend/frontend only if changed:

```bash
cd backend
npm run build
npm run test:cov
```

```bash
cd frontend
npm run build
npm run test
```

Manual test:

1. Start payment-service in MOCK mode and confirm existing mock flow still works.
2. Start payment-service with `payment.provider=RAZORPAY`.
3. Set `RAZORPAY_WEBHOOK_SECRET` to a local test value.
4. Send a locally signed fake `payment.captured` webhook body.
5. Confirm payment changes to SUCCESS.
6. Send same webhook again and confirm idempotent behavior.
7. Send invalid signature and confirm friendly error.
8. Send fake `payment.failed` webhook for INITIATED payment and confirm FAILED.
9. Confirm payment-service health still works.

Documentation:
Create report:
`.grok/reports/phase-8c-razorpay-webhook-handler.md`

Update:

* `payment-service/README.md`
* `payment-service/src/main/resources/application-example.properties`

Report must include:

1. Files changed
2. Webhook endpoint contract
3. Signature verification behavior
4. Supported webhook events
5. Status transition behavior
6. Tests added
7. Build result
8. Manual test result
9. Pending issues

Commit:

```bash
git status
git add .
git commit -m "Add Razorpay webhook handler"
git push -u origin feature/phase-8c-razorpay-webhook-handler
```

Open a PR to develop:
Title:
`Add Razorpay webhook handler`

PR body:

* Summary
* Webhook endpoint
* Supported events
* Signature verification
* Validation
* Manual smoke test
* Pending issues

Do not merge the PR.
