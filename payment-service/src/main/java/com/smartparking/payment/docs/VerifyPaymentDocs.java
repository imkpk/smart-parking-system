package com.smartparking.payment.docs;

import com.smartparking.payment.dto.PaymentResponse;
import com.smartparking.payment.dto.VerifyPaymentRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Operation(
        summary = PaymentApiDocs.VERIFY_SUMMARY,
        description = PaymentApiDocs.VERIFY_DESCRIPTION
)
@io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @Content(
                schema = @Schema(implementation = VerifyPaymentRequest.class),
                examples = @ExampleObject(value = PaymentApiDocs.VERIFY_EXAMPLE)
        )
)
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "Payment verified",
                content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid verification request"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Not allowed to verify this payment"),
        @ApiResponse(responseCode = "404", description = "Payment not found"),
        @ApiResponse(responseCode = "409", description = "Payment cannot be verified in current state"),
        @ApiResponse(responseCode = "502", description = "Razorpay configuration is missing")
})
public @interface VerifyPaymentDocs {
}