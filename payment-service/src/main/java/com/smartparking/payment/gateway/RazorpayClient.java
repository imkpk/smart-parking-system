package com.smartparking.payment.gateway;

import java.math.BigDecimal;

public interface RazorpayClient {
    RazorpayOrderResponse createOrder(BigDecimal amount, String currency, String receipt);
}