package com.smartparking.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "security.service-jwt")
public record ServiceJwtProperties(
        String secret,
        String issuer,
        String audience
) {
}