package com.smartparking.payment.gateway;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.smartparking.payment.config.PaymentProviderProperties;
import com.smartparking.payment.exception.PaymentGatewayException;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentMethod;
import com.smartparking.payment.model.PaymentStatus;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RazorpayPaymentGatewayProviderTest {
    @Mock
    private RazorpayClient razorpayClient;

    private PaymentProviderProperties properties;
    private RazorpayPaymentGatewayProvider provider;

    @BeforeEach
    void setUp() {
        properties = new PaymentProviderProperties();
        provider = new RazorpayPaymentGatewayProvider(properties, razorpayClient);
    }

    @Test
    void createsRazorpayOrderWhenConfigured() {
        properties.getRazorpay().setKeyId("rzp_test_key");
        properties.getRazorpay().setKeySecret("secret");
        when(razorpayClient.createOrder(any(), any(), any()))
                .thenReturn(new RazorpayOrderResponse("order_test_123", "created"));

        GatewayInitiationResult result = provider.initiate(samplePayment());

        assertThat(result.gatewayOrderId()).isEqualTo("order_test_123");
        assertThat(result.gatewayStatus()).isEqualTo("created");
    }

    @Test
    void rejectsMissingRazorpayConfiguration() {
        assertThatThrownBy(() -> provider.initiate(samplePayment()))
                .isInstanceOf(PaymentGatewayException.class)
                .hasMessage("Razorpay configuration is missing");
    }

    private Payment samplePayment() {
        Payment payment = new Payment();
        payment.setParkingEventId(1L);
        payment.setBookingId(1L);
        payment.setUserId(1L);
        payment.setAmount(new BigDecimal("80.00"));
        payment.setCurrency("INR");
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setPaymentMethod(PaymentMethod.MOCK);
        return payment;
    }
}