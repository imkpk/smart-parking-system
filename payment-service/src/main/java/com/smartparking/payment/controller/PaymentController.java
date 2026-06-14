package com.smartparking.payment.controller;

import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.dto.PaymentResponse;
import com.smartparking.payment.dto.PaymentSummaryResponse;
import com.smartparking.payment.docs.GetPaymentDocs;
import com.smartparking.payment.docs.GetUserPaymentsDocs;
import com.smartparking.payment.docs.InitiatePaymentDocs;
import com.smartparking.payment.docs.MockFailurePaymentDocs;
import com.smartparking.payment.docs.MockSuccessPaymentDocs;
import com.smartparking.payment.docs.PaymentApi;
import com.smartparking.payment.docs.PaymentHealthDocs;
import com.smartparking.payment.docs.PaymentSummaryDocs;
import com.smartparking.payment.security.AuthUtils;
import com.smartparking.payment.service.PaymentService;
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
@PaymentApi
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/health")
    @PaymentHealthDocs
    public com.smartparking.payment.dto.ApiResponse<Map<String, String>> health() {
        return com.smartparking.payment.dto.ApiResponse.success(
                "Payment service is healthy",
                Map.of("status", "ok", "service", "payment-service")
        );
    }

    @PostMapping("/initiate")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @InitiatePaymentDocs
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> initiate(
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
    @MockSuccessPaymentDocs
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> mockSuccess(
            @PathVariable @Positive Long id
    ) {
        return com.smartparking.payment.dto.ApiResponse.success("Payment marked SUCCESS", paymentService.markSuccess(id));
    }

    @PostMapping("/{id}/mock-failure")
    @PreAuthorize("hasRole('ADMIN')")
    @MockFailurePaymentDocs
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> mockFailure(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MockFailureRequest request
    ) {
        return com.smartparking.payment.dto.ApiResponse.success("Payment marked FAILED", paymentService.markFailure(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetPaymentDocs
    public com.smartparking.payment.dto.ApiResponse<PaymentResponse> findById(
            @PathVariable @Positive Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return com.smartparking.payment.dto.ApiResponse.success(
                "Payment details",
                paymentService.findById(id, AuthUtils.userId(jwt), AuthUtils.isAdmin(jwt))
        );
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetUserPaymentsDocs
    public com.smartparking.payment.dto.ApiResponse<List<PaymentResponse>> findByUserId(
            @PathVariable @Positive Long userId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return com.smartparking.payment.dto.ApiResponse.success(
                "User payments",
                paymentService.findByUserId(userId, AuthUtils.userId(jwt), AuthUtils.isAdmin(jwt))
        );
    }

    @GetMapping("/reports/summary")
    @PreAuthorize("hasRole('ADMIN')")
    @PaymentSummaryDocs
    public com.smartparking.payment.dto.ApiResponse<PaymentSummaryResponse> summary() {
        return com.smartparking.payment.dto.ApiResponse.success("Payment summary", paymentService.summary());
    }
}
