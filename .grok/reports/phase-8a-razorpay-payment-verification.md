# Phase 8a Complete — Razorpay Payment Verification Endpoint

## 1. Files changed

**New**
- `payment-service/src/main/java/com/smartparking/payment/dto/VerifyPaymentRequest.java`
- `payment-service/src/main/java/com/smartparking/payment/gateway/RazorpaySignatureVerifier.java`
- `payment-service/src/main/java/com/smartparking/payment/exception/PaymentVerificationException.java`
- `payment-service/src/main/java/com/smartparking/payment/docs/VerifyPaymentDocs.java`
- `payment-service/src/test/java/com/smartparking/payment/gateway/RazorpaySignatureVerifierTest.java`

**Updated**
- `payment-service/src/main/java/com/smartparking/payment/service/PaymentService.java` — `verify()` flow
- `payment-service/src/main/java/com/smartparking/payment/controller/PaymentController.java` — `POST /api/payments/verify`
- `payment-service/src/main/java/com/smartparking/payment/config/PaymentProviderProperties.java` — `hasRazorpaySecret()`
- `payment-service/src/main/java/com/smartparking/payment/exception/GlobalExceptionHandler.java` — 400 for verification errors
- `payment-service/src/main/java/com/smartparking/payment/docs/PaymentApiDocs.java` — verify docs constants
- `payment-service/src/test/java/com/smartparking/payment/service/PaymentServiceTest.java` — verify unit tests
- `payment-service/src/test/java/com/smartparking/payment/controller/PaymentApiIntegrationTest.java` — verify integration tests
- `payment-service/src/test/java/com/smartparking/payment/support/PaymentTestFixtures.java` — Razorpay fixture helper
- `payment-service/src/test/resources/application-test.properties` — test Razorpay secret

## 2. Verify endpoint contract

`POST /api/payments/verify`

**Auth:** JWT required (`USER`, `ADMIN`, or `SECURITY`). Caller must own the payment unless admin/security.

**Request body:**
```json
{
  "paymentId": 10,
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Payment verified",
  "data": { "status": "SUCCESS", "providerReference": "pay_xxx", "gatewayStatus": "captured", ... }
}
```

**Error responses:**
| Condition | HTTP | Message |
|-----------|------|---------|
| Payment not found | 404 | Payment not found |
| Not Razorpay payment | 400 | Only Razorpay payments can be verified |
| Order id mismatch | 400 | Order id does not match this payment |
| Invalid signature | 400 | Invalid payment signature |
| FAILED / REFUNDED payment | 409 | Phase 7b state error message |
| Missing Razorpay secret | 502 | Razorpay configuration is missing |
| Already SUCCESS | 200 | Idempotent — returns existing payment |

## 3. Signature verification behavior

1. Payload: `razorpayOrderId + "|" + razorpayPaymentId`
2. Algorithm: HMAC SHA256 with `payment.razorpay.key-secret`
3. Compare computed hex digest to `razorpaySignature` using constant-time comparison
4. Secret and full signature are never logged or returned in API responses
5. No outbound Razorpay API call — verification is local signature check only

## 4. Status transition behavior

| Current status | Action |
|----------------|--------|
| INITIATED + valid signature | → SUCCESS; saves `gatewayPaymentId`, `gatewaySignature`, `gatewayStatus=captured`, `providerReference=razorpayPaymentId` |
| SUCCESS | Idempotent return (no re-verification) |
| FAILED | Blocked — 409 conflict |
| REFUNDED | Blocked — 409 conflict |
| MOCK provider payment | Blocked — 400 (verify is Razorpay-only) |

Phase 7b mock success/failure flow unchanged.

## 5. Tests added

**RazorpaySignatureVerifierTest (3)**
- Valid signature accepted
- Invalid signature rejected
- Mismatched order id rejected

**PaymentServiceTest (7 new)**
- Valid signature marks payment SUCCESS
- Invalid signature rejected
- Wrong order id rejected
- Non-RAZORPAY payment blocked
- Already SUCCESS is idempotent
- FAILED payment blocked
- Missing Razorpay secret returns config error

**PaymentApiIntegrationTest (2 new)**
- MOCK payment verify rejected
- Razorpay payment with computed test signature marked SUCCESS

MOCK provider initiate + mock success/failure tests unchanged and passing.

## 6. Build result

- `cd payment-service && mvn clean test` — **52/52 passed**
- `cd payment-service && mvn clean package` — **BUILD SUCCESS**
- Backend build skipped (no backend files changed)

## 7. Manual test result

| Test | Result |
|------|--------|
| MOCK mode health (`GET /api/payments/health`) | **PASSED** — service healthy on port 8081 |
| RAZORPAY mode verify without secret | **PASSED** (automated) — `PaymentServiceTest.verifyRequiresRazorpaySecret` |
| Real Razorpay checkout + live signature verify | **PENDING** — no test keys configured in this environment |

## 8. Pending issues

- Frontend Razorpay checkout UI not implemented (out of scope for Phase 8a)
- Razorpay webhook handler not implemented (deferred)
- Refund flow not implemented (deferred)
- End-to-end verification with live Razorpay test keys pending manual QA when keys are available