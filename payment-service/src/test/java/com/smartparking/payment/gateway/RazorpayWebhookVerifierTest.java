package com.smartparking.payment.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RazorpayWebhookVerifierTest {
    private final RazorpayWebhookVerifier verifier = new RazorpayWebhookVerifier();

    @Test
    void acceptsValidWebhookSignature() {
        String rawBody = "{\"event\":\"payment.captured\"}";
        String secret = "webhook_secret_test";

        String signature = RazorpayWebhookVerifier.computeSignature(rawBody, secret);

        assertThat(verifier.verify(rawBody, signature, secret)).isTrue();
    }

    @Test
    void rejectsInvalidWebhookSignature() {
        assertThat(verifier.verify("{\"event\":\"payment.captured\"}", "invalid", "webhook_secret_test"))
                .isFalse();
    }
}