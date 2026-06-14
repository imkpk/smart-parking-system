package com.smartparking.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record MockFailureRequest(
        @Schema(example = "Mock provider declined payment")
        @NotBlank String failureReason
) {
}
