package com.smartparking.payment.gateway;

import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentProviderType;
import org.springframework.stereotype.Component;

@Component
public class MockPaymentGatewayProvider implements PaymentGatewayProvider {
    @Override
    public PaymentProviderType providerType() {
        return PaymentProviderType.MOCK;
    }

    @Override
    public GatewayInitiationResult initiate(Payment payment) {
        return GatewayInitiationResult.empty();
    }
}