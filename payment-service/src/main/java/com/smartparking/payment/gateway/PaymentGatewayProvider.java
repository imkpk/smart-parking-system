package com.smartparking.payment.gateway;

import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentProviderType;

public interface PaymentGatewayProvider {
    PaymentProviderType providerType();

    GatewayInitiationResult initiate(Payment payment);
}