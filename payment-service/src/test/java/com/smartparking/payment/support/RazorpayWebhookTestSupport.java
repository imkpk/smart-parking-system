package com.smartparking.payment.support;

import com.smartparking.payment.gateway.RazorpayWebhookVerifier;

public final class RazorpayWebhookTestSupport {
    public static final String WEBHOOK_SECRET = "webhook_secret_test";

    private RazorpayWebhookTestSupport() {
    }

    public static String capturedPayload(String orderId, String paymentId) {
        return """
                {
                  "event": "payment.captured",
                  "payload": {
                    "payment": {
                      "entity": {
                        "id": "%s",
                        "order_id": "%s",
                        "status": "captured"
                      }
                    }
                  }
                }
                """.formatted(paymentId, orderId);
    }

    public static String failedPayload(String orderId, String paymentId, String failureReason) {
        return """
                {
                  "event": "payment.failed",
                  "payload": {
                    "payment": {
                      "entity": {
                        "id": "%s",
                        "order_id": "%s",
                        "status": "failed",
                        "error_description": "%s"
                      }
                    }
                  }
                }
                """.formatted(paymentId, orderId, failureReason);
    }

    public static String unknownEventPayload() {
        return """
                {
                  "event": "payment.authorized",
                  "payload": {
                    "payment": {
                      "entity": {
                        "id": "pay_test_456",
                        "order_id": "order_test_123"
                      }
                    }
                  }
                }
                """;
    }

    public static String sign(String rawBody) {
        return RazorpayWebhookVerifier.computeSignature(rawBody, WEBHOOK_SECRET);
    }
}