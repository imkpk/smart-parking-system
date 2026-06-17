package com.smartparking.payment.controller;

import com.smartparking.payment.docs.PaymentApi;
import com.smartparking.payment.docs.RazorpayWebhookDocs;
import com.smartparking.payment.dto.ApiResponse;
import com.smartparking.payment.dto.WebhookResponse;
import com.smartparking.payment.service.PaymentService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/webhook")
@PaymentApi
public class PaymentWebhookController {
    private final PaymentService paymentService;

    public PaymentWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/razorpay")
    @RazorpayWebhookDocs
    public ApiResponse<WebhookResponse> razorpayWebhook(
            @RequestBody String rawBody,
            @RequestHeader("X-Razorpay-Signature") String signature
    ) {
        WebhookResponse response = paymentService.handleRazorpayWebhook(rawBody, signature);
        return ApiResponse.success("Webhook handled", response);
    }
}