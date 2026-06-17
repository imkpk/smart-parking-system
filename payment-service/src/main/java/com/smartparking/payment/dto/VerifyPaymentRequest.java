package com.smartparking.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record VerifyPaymentRequest(
        @Schema(example = "10")
        @NotNull @Positive Long paymentId,
        @Schema(example = "order_xxx")
        @NotBlank String razorpayOrderId,
        @Schema(example = "pay_xxx")
        @NotBlank String razorpayPaymentId,
        @Schema(example = "signature_xxx")
        @NotBlank String razorpaySignature
) {
}