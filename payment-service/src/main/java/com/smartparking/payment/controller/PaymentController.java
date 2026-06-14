package com.smartparking.payment.controller;

import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.dto.PaymentResponse;
import com.smartparking.payment.dto.PaymentSummaryResponse;
import com.smartparking.payment.security.AuthUtils;
import com.smartparking.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@Validated
@Tag(name = "Payments", description = "Payment lifecycle and reporting APIs")
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/health")
    @Operation(summary = "Payment service health check")
    @ApiResponse(responseCode = "200", description = "Payment service is healthy")
    public com.smartparking.payment.dto.ApiResponse<Map<String, String>> health() {
        return com.smartparking.payment.dto.ApiResponse.success(
                "Payment service is healthy",
                Map.of("status", "ok", "service", "payment-service")
        );
    }

    @PostMapping("/initiate")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Operation(summary = "Initiate a payment", description = "Creates a new INITIATED payment record.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Payment initiated",
                    content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed")
    })
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> initiate(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(
                            schema = @Schema(implementation = InitiatePaymentRequest.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "parkingEventId": 1,
                                      "bookingId": 1,
                                      "userId": 1,
                                      "amount": 80,
                                      "currency": "INR",
                                      "paymentMethod": "MOCK"
                                    }
                                    """)
                    )
            )
            @Valid @RequestBody InitiatePaymentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return com.smartparking.payment.dto.ApiResponse.success(
                "Payment initiated",
                paymentService.initiate(request, AuthUtils.userId(jwt), AuthUtils.isAdmin(jwt))
        );
    }

    @PostMapping("/{id}/mock-success")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mark payment as mock success", description = "Marks an INITIATED payment as SUCCESS and generates a provider reference.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment marked SUCCESS",
                    content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "404", description = "Payment not found"),
            @ApiResponse(responseCode = "409", description = "Payment state transition is not allowed")
    })
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> mockSuccess(
            @Parameter(example = "1") @PathVariable @Positive Long id
    ) {
        return com.smartparking.payment.dto.ApiResponse.success("Payment marked SUCCESS", paymentService.markSuccess(id));
    }

    @PostMapping("/{id}/mock-failure")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mark payment as mock failure", description = "Marks an INITIATED payment as FAILED and stores a failure reason.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment marked FAILED",
                    content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "404", description = "Payment not found"),
            @ApiResponse(responseCode = "409", description = "Payment state transition is not allowed")
    })
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> mockFailure(
            @Parameter(example = "1") @PathVariable @Positive Long id,
            @Valid @RequestBody MockFailureRequest request
    ) {
        return com.smartparking.payment.dto.ApiResponse.success("Payment marked FAILED", paymentService.markFailure(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Operation(summary = "Get payment by id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment details",
                    content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> findById(
            @Parameter(example = "1") @PathVariable @Positive Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return com.smartparking.payment.dto.ApiResponse.success(
                "Payment details",
                paymentService.findById(id, AuthUtils.userId(jwt), AuthUtils.isAdmin(jwt))
        );
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Operation(summary = "Get payments by user id")
    @ApiResponse(responseCode = "200", description = "User payments")
    public com.smartparking.payment.dto.ApiResponse<List<PaymentResponse>> findByUserId(
            @Parameter(example = "1") @PathVariable @Positive Long userId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return com.smartparking.payment.dto.ApiResponse.success(
                "User payments",
                paymentService.findByUserId(userId, AuthUtils.userId(jwt), AuthUtils.isAdmin(jwt))
        );
    }

    @GetMapping("/reports/summary")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get payment summary report")
    @ApiResponse(responseCode = "200", description = "Payment summary",
            content = @Content(schema = @Schema(implementation = PaymentSummaryResponse.class)))
    public com.smartparking.payment.dto.ApiResponse<PaymentSummaryResponse> summary() {
        return com.smartparking.payment.dto.ApiResponse.success("Payment summary", paymentService.summary());
    }
}
