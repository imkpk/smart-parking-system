package com.smartparking.payment.gateway;

public record GatewayInitiationResult(
        String gatewayOrderId,
        String gatewayStatus
) {
    public static GatewayInitiationResult empty() {
        return new GatewayInitiationResult(null, null);
    }
}