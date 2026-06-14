package com.smartparking.payment.dto;

import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentMethod;
import com.smartparking.payment.model.PaymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        @Schema(example = "1")
        Long id,
        @Schema(example = "1")
        Long parkingEventId,
        @Schema(example = "1")
        Long bookingId,
        @Schema(example = "1")
        Long userId,
        @Schema(example = "80")
        BigDecimal amount,
        @Schema(example = "INR")
        String currency,
        @Schema(example = "INITIATED")
        PaymentStatus status,
        @Schema(example = "MOCK")
        PaymentMethod paymentMethod,
        @Schema(example = "MOCK-550e8400-e29b-41d4-a716-446655440000")
        String providerReference,
        @Schema(example = "Mock provider declined payment")
        String failureReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getParkingEventId(),
                payment.getBookingId(),
                payment.getUserId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getPaymentMethod(),
                payment.getProviderReference(),
                payment.getFailureReason(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }
}
