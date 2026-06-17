package com.smartparking.payment.config;

import com.smartparking.payment.model.PaymentProviderType;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "payment")
public class PaymentProviderProperties {
    private PaymentProviderType provider = PaymentProviderType.MOCK;
    private Razorpay razorpay = new Razorpay();

    public PaymentProviderType getProvider() {
        return provider;
    }

    public void setProvider(PaymentProviderType provider) {
        this.provider = provider;
    }

    public Razorpay getRazorpay() {
        return razorpay;
    }

    public void setRazorpay(Razorpay razorpay) {
        this.razorpay = razorpay;
    }

    public boolean hasRazorpayCredentials() {
        return razorpay.keyId != null
                && !razorpay.keyId.isBlank()
                && razorpay.keySecret != null
                && !razorpay.keySecret.isBlank();
    }

    public static class Razorpay {
        private String keyId = "";
        private String keySecret = "";
        private String currency = "INR";

        public String getKeyId() {
            return keyId;
        }

        public void setKeyId(String keyId) {
            this.keyId = keyId;
        }

        public String getKeySecret() {
            return keySecret;
        }

        public void setKeySecret(String keySecret) {
            this.keySecret = keySecret;
        }

        public String getCurrency() {
            return currency;
        }

        public void setCurrency(String currency) {
            this.currency = currency;
        }
    }
}