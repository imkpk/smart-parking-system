Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 8a only: Razorpay Payment Verification Endpoint.

Do not change frontend.
Do not add webhook in this phase.
Do not add refund flow.
Do not remove MOCK provider.
Do not break existing mock payment success/failure.
Do not commit real Razorpay keys.
Do not merge the PR.

Create a new branch from latest develop:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/phase-8a-razorpay-payment-verification
```

Goal:
Add backend payment-service support to verify Razorpay payment completion using Razorpay payment id, order id, and signature.

Current state:

* PAYMENT_PROVIDER=MOCK works by default.
* PAYMENT_PROVIDER=RAZORPAY creates Razorpay order and stores gatewayOrderId.
* Razorpay verify endpoint is pending.
* Frontend Razorpay checkout UI is pending.

Scope:
Payment service only unless backend DTO type alignment is absolutely required.

Inspect:

* payment-service/src/main/java/com/smartparking/payment/gateway
* payment-service/src/main/java/com/smartparking/payment/service/PaymentService.java
* payment-service/src/main/java/com/smartparking/payment/controller
* payment-service/src/main/java/com/smartparking/payment/model/Payment.java
* payment-service/src/main/java/com/smartparking/payment/dto
* payment-service/src/main/java/com/smartparking/payment/exception
* payment-service/src/test/java

Expected endpoint:
POST /api/payments/verify

Suggested request body:

```json
{
  "paymentId": 10,
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx"
}
```

Expected behavior:

1. Find payment by internal paymentId.
2. Confirm payment provider is RAZORPAY.
3. Confirm payment is currently INITIATED.
4. Confirm stored gatewayOrderId matches razorpayOrderId.
5. Verify signature using HMAC SHA256:
   payload = razorpayOrderId + "|" + razorpayPaymentId
   secret = RAZORPAY_KEY_SECRET
6. If signature is valid:

   * update payment status to SUCCESS
   * save gatewayPaymentId
   * save gatewaySignature if already supported
   * save gatewayStatus if supported
7. If signature is invalid:

   * return friendly error
   * do not mark payment SUCCESS
8. If payment is already SUCCESS:

   * return existing payment safely or idempotent success
9. If payment is FAILED or REFUNDED:

   * block verification with friendly error

Rules:

1. Never expose Razorpay secret.
2. Never log full signature or secret.
3. Use friendly errors.
4. Do not expose raw stack traces.
5. Keep MOCK provider behavior unchanged.
6. Keep Phase 7b status transition rules.
7. Keep tests using fake/test signatures only.
8. Do not call real Razorpay API for verification tests.
9. Keep code small and readable.
10. Do not change database schema unless absolutely needed; use existing gateway fields if present.

Testing:
Add tests for:

* Valid signature marks payment SUCCESS
* Invalid signature is rejected
* Wrong order id is rejected
* Non-RAZORPAY payment cannot be verified
* Already SUCCESS verification is safe/idempotent
* FAILED payment verification is blocked
* Missing Razorpay secret returns friendly config error
* MOCK provider flow still works

Run:

```bash
cd payment-service
mvn clean test
mvn clean package
```

Run backend build only if backend files changed:

```bash
cd ../backend
npm run build
npm run test:cov
```

Manual test:

1. Start payment-service in MOCK mode and confirm health.
2. Start payment-service in RAZORPAY mode without secret and confirm verify returns friendly config error.
3. If test keys are available, create Razorpay payment and verify signature.
4. If test keys are not available, document automated signature tests as passed and real Razorpay verification as pending.

Documentation:
Create report:
.grok/reports/phase-8a-razorpay-payment-verification.md

Report must include:

1. Files changed
2. Verify endpoint contract
3. Signature verification behavior
4. Status transition behavior
5. Tests added
6. Build result
7. Manual test result
8. Pending issues

Commit:

```bash
git status
git add .
git commit -m "Add Razorpay payment verification endpoint"
git push -u origin feature/phase-8a-razorpay-payment-verification
```

Open a PR to develop:
Title:
Add Razorpay payment verification endpoint

Do not merge the PR.
