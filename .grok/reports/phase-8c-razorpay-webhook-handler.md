# Phase 8c Complete — Razorpay Webhook Handler

## 1. Files changed

**New**
- `payment-service/src/main/java/com/smartparking/payment/controller/PaymentWebhookController.java`
- `payment-service/src/main/java/com/smartparking/payment/gateway/RazorpayWebhookVerifier.java`
- `payment-service/src/main/java/com/smartparking/payment/gateway/RazorpayWebhookParser.java`
- `payment-service/src/main/java/com/smartparking/payment/gateway/RazorpayWebhookEvent.java`
- `payment-service/src/main/java/com/smartparking/payment/dto/WebhookResponse.java`
- `payment-service/src/main/java/com/smartparking/payment/exception/PaymentWebhookException.java`
- `payment-service/src/main/java/com/smartparking/payment/docs/RazorpayWebhookDocs.java`
- `payment-service/src/test/java/com/smartparking/payment/gateway/RazorpayWebhookVerifierTest.java`
- `payment-service/src/test/java/com/smartparking/payment/support/RazorpayWebhookTestSupport.java`

**Updated**
- `payment-service/src/main/java/com/smartparking/payment/service/PaymentService.java` — `handleRazorpayWebhook()`
- `payment-service/src/main/java/com/smartparking/payment/config/PaymentProviderProperties.java` — `webhook-secret`
- `payment-service/src/main/java/com/smartparking/payment/config/SecurityConfig.java` — public webhook route
- `payment-service/src/main/java/com/smartparking/payment/repository/PaymentRepository.java` — `findByGatewayOrderId`
- `payment-service/src/main/java/com/smartparking/payment/exception/GlobalExceptionHandler.java` — 401 for invalid signature
- `payment-service/src/main/java/com/smartparking/payment/docs/PaymentApiDocs.java`
- `payment-service/src/test/java/com/smartparking/payment/service/PaymentServiceTest.java` — 10 webhook tests
- `payment-service/src/test/java/com/smartparking/payment/controller/PaymentApiIntegrationTest.java` — 3 webhook tests
- `payment-service/src/test/resources/application-test.properties`
- `payment-service/src/main/resources/application-example.properties`
- `payment-service/README.md`

## 2. Webhook endpoint contract

`POST /api/payments/webhook/razorpay`

**Auth:** No JWT. Verified via `X-Razorpay-Signature` header.

**Request:** Raw JSON body (must not be reformatted before signature verification).

**Success (200):**
```json
{
  "success": true,
  "message": "Webhook handled",
  "data": { "status": "processed" }
}
```

or ignored:
```json
{ "data": { "status": "ignored" } }
```

**Errors:**
| Condition | HTTP | Message |
|-----------|------|---------|
| Invalid signature | 401 | Invalid webhook signature |
| Missing webhook secret | 502 | Razorpay webhook configuration is missing |

## 3. Signature verification behavior

1. Uses raw request body bytes (not parsed JSON)
2. HMAC SHA256 with `payment.razorpay.webhook-secret`
3. Constant-time hex comparison with `X-Razorpay-Signature`
4. Separate from `key-secret` (checkout verify uses key-secret; webhook uses webhook-secret)
5. Secret and full signature are never logged or returned

## 4. Supported webhook events

| Event | Behavior |
|-------|----------|
| `payment.captured` | INITIATED RAZORPAY payment → SUCCESS; saves gateway payment id, `gatewayStatus=captured`, `providerReference` |
| `payment.failed` | INITIATED RAZORPAY payment → FAILED; saves failure reason and gateway fields |
| Other events | Ignored safely (200, `status=ignored`) |
| No matching payment | Ignored safely |
| MOCK provider match | Ignored safely (not updated) |

## 5. Status transition behavior

| Current | Event | Result |
|---------|-------|--------|
| INITIATED | payment.captured | SUCCESS |
| INITIATED | payment.failed | FAILED |
| SUCCESS | payment.captured | Idempotent processed |
| FAILED | payment.failed | Idempotent processed |
| FAILED | payment.captured | Ignored |
| SUCCESS | payment.failed | Ignored |
| REFUNDED | any | Ignored (policy blocks change) |

Phase 7b rules preserved. MOCK provider and existing checkout/verify flows unchanged.

## 6. Tests added

**RazorpayWebhookVerifierTest (2)**
- Valid/invalid webhook signature

**PaymentServiceTest (10 new)**
- captured → SUCCESS, failed → FAILED
- invalid signature rejected
- missing webhook secret config error
- unknown event ignored
- idempotent SUCCESS/FAILED
- SUCCESS cannot become FAILED, FAILED cannot become SUCCESS
- MOCK provider ignored

**PaymentApiIntegrationTest (3 new)**
- Webhook works without JWT
- Invalid signature → 401
- MOCK provider payment not updated

Total: **67/67 passed**

## 7. Build result

- `cd payment-service && mvn clean test` — **67/67 passed**
- `cd payment-service && mvn clean package` — **BUILD SUCCESS**
- Frontend/backend unchanged — no additional builds

## 8. Manual test result

| Test | Result |
|------|--------|
| Automated signed `payment.captured` webhook | **PASSED** (integration test) |
| Automated idempotent/id conflict cases | **PASSED** (unit tests) |
| Invalid signature friendly 401 | **PASSED** (integration test) |
| MOCK provider not updated by webhook | **PASSED** (integration test) |
| Live Razorpay dashboard webhook delivery | **PENDING** — requires public URL + real webhook secret |

## 9. Pending issues

- Refund flow not implemented (deferred)
- Live Razorpay webhook delivery pending public endpoint and dashboard configuration
- No queue/retry framework (by design for this phase)