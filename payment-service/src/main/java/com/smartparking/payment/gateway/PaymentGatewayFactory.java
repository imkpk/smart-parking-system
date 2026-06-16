package com.smartparking.payment.gateway;

import com.smartparking.payment.config.PaymentProviderProperties;
import com.smartparking.payment.exception.PaymentGatewayException;
import com.smartparking.payment.model.PaymentProviderType;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PaymentGatewayFactory {
    private final PaymentProviderProperties properties;
    private final Map<PaymentProviderType, PaymentGatewayProvider> providers;

    public PaymentGatewayFactory(
            PaymentProviderProperties properties,
            List<PaymentGatewayProvider> providers
    ) {
        this.properties = properties;
        this.providers = new EnumMap<>(PaymentProviderType.class);
        providers.forEach(provider -> this.providers.put(provider.providerType(), provider));
    }

    public PaymentGatewayProvider activeProvider() {
        PaymentProviderType providerType = properties.getProvider();
        PaymentGatewayProvider provider = providers.get(providerType);

        if (provider == null) {
            throw new PaymentGatewayException("Unsupported payment provider: " + providerType);
        }

        return provider;
    }
}