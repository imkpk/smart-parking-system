package com.smartparking.payment.docs;

import com.smartparking.payment.dto.WebhookResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Operation(
        summary = PaymentApiDocs.RAZORPAY_WEBHOOK_SUMMARY,
        description = PaymentApiDocs.RAZORPAY_WEBHOOK_DESCRIPTION
)
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "Webhook processed or ignored"),
        @ApiResponse(responseCode = "401", description = "Invalid webhook signature"),
        @ApiResponse(responseCode = "502", description = "Webhook configuration is missing")
})
public @interface RazorpayWebhookDocs {
}