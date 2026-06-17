package com.smartparking.payment.gateway;

public record RazorpayWebhookEvent(
        String event,
        String orderId,
        String paymentId,
        String failureReason
) {
    public static RazorpayWebhookEvent unknown() {
        return new RazorpayWebhookEvent(null, null, null, null);
    }

    public boolean isPaymentCaptured() {
        return "payment.captured".equals(event);
    }

    public boolean isPaymentFailed() {
        return "payment.failed".equals(event);
    }
}