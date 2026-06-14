package com.smartparking.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.Map;

public record PaymentSummaryResponse(
        @Schema(example = "12")
        long totalPayments,
        @Schema(example = "840")
        BigDecimal successfulAmount,
        Map<String, Long> paymentsByStatus
) {
}
