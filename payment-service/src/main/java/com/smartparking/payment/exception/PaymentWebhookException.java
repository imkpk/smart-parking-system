package com.smartparking.payment.exception;

public class PaymentWebhookException extends RuntimeException {
    public PaymentWebhookException(String message) {
        super(message);
    }
}