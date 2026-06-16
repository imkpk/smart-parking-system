package com.smartparking.payment.gateway;

import com.smartparking.payment.config.PaymentProviderProperties;
import com.smartparking.payment.exception.PaymentGatewayException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class HttpRazorpayClient implements RazorpayClient {
    private final RestTemplate restTemplate;
    private final PaymentProviderProperties properties;

    public HttpRazorpayClient(RestTemplateBuilder restTemplateBuilder, PaymentProviderProperties properties) {
        this.restTemplate = restTemplateBuilder.build();
        this.properties = properties;
    }

    @Override
    public RazorpayOrderResponse createOrder(BigDecimal amount, String currency, String receipt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(
                properties.getRazorpay().getKeyId(),
                properties.getRazorpay().getKeySecret(),
                StandardCharsets.UTF_8
        );

        Map<String, Object> body = Map.of(
                "amount", toPaise(amount),
                "currency", currency,
                "receipt", receipt
        );

        try {
            ResponseEntity<RazorpayOrderApiResponse> response = restTemplate.postForEntity(
                    "https://api.razorpay.com/v1/orders",
                    new HttpEntity<>(body, headers),
                    RazorpayOrderApiResponse.class
            );

            RazorpayOrderApiResponse order = response.getBody();
            if (order == null || order.id() == null || order.id().isBlank()) {
                throw new PaymentGatewayException("Unable to create Razorpay order");
            }

            return new RazorpayOrderResponse(order.id(), order.status());
        } catch (RestClientException exception) {
            throw new PaymentGatewayException("Unable to create Razorpay order");
        }
    }

    private long toPaise(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();
    }

    private record RazorpayOrderApiResponse(String id, String status) {
    }
}