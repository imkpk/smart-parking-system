package com.smartparking.payment.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RazorpaySignatureVerifierTest {
    private final RazorpaySignatureVerifier verifier = new RazorpaySignatureVerifier();

    @Test
    void acceptsValidSignature() {
        String orderId = "order_test_123";
        String paymentId = "pay_test_456";
        String secret = "test_secret_key";

        String signature = RazorpaySignatureVerifier.computeSignature(orderId, paymentId, secret);

        assertThat(verifier.verify(orderId, paymentId, signature, secret)).isTrue();
    }

    @Test
    void rejectsInvalidSignature() {
        assertThat(verifier.verify("order_test_123", "pay_test_456", "invalid_signature", "test_secret_key"))
                .isFalse();
    }

    @Test
    void rejectsMismatchedOrderId() {
        String secret = "test_secret_key";
        String signature = RazorpaySignatureVerifier.computeSignature("order_a", "pay_test_456", secret);

        assertThat(verifier.verify("order_b", "pay_test_456", signature, secret)).isFalse();
    }
}