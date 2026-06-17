package com.smartparking.payment.dto;

public record WebhookResponse(String status) {
    public static WebhookResponse ignored() {
        return new WebhookResponse("ignored");
    }

    public static WebhookResponse processed() {
        return new WebhookResponse("processed");
    }
}