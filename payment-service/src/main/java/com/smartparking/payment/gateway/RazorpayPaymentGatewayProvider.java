package com.smartparking.payment.gateway;

import com.smartparking.payment.config.PaymentProviderProperties;
import com.smartparking.payment.exception.PaymentGatewayException;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentProviderType;
import org.springframework.stereotype.Component;

@Component
public class RazorpayPaymentGatewayProvider implements PaymentGatewayProvider {
    private final PaymentProviderProperties properties;
    private final RazorpayClient razorpayClient;

    public RazorpayPaymentGatewayProvider(
            PaymentProviderProperties properties,
            RazorpayClient razorpayClient
    ) {
        this.properties = properties;
        this.razorpayClient = razorpayClient;
    }

    @Override
    public PaymentProviderType providerType() {
        return PaymentProviderType.RAZORPAY;
    }

    @Override
    public GatewayInitiationResult initiate(Payment payment) {
        if (!properties.hasRazorpayCredentials()) {
            throw new PaymentGatewayException("Razorpay configuration is missing");
        }

        String currency = properties.getRazorpay().getCurrency();
        RazorpayOrderResponse order = razorpayClient.createOrder(
                payment.getAmount(),
                currency,
                "payment-" + payment.getId()
        );

        return new GatewayInitiationResult(order.id(), order.status());
    }
}