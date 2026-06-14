package com.smartparking.payment.dto;

import com.smartparking.payment.model.PaymentMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record InitiatePaymentRequest(
        @Schema(example = "1")
        @NotNull @Positive Long parkingEventId,
        @Schema(example = "1")
        @NotNull @Positive Long bookingId,
        @Schema(example = "1")
        @NotNull @Positive Long userId,
        @Schema(example = "80")
        @NotNull @DecimalMin(value = "0.01", message = "amount must be greater than 0") BigDecimal amount,
        @Schema(example = "INR", defaultValue = "INR")
        String currency,
        @Schema(example = "MOCK")
        @NotNull PaymentMethod paymentMethod
) {
}
