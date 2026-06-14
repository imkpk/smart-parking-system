package com.smartparking.payment.docs;

import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.PaymentResponse;
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
        summary = PaymentApiDocs.INITIATE_SUMMARY,
        description = PaymentApiDocs.INITIATE_DESCRIPTION
)
@io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @Content(
                schema = @Schema(implementation = InitiatePaymentRequest.class),
                examples = @ExampleObject(value = PaymentApiDocs.INITIATE_EXAMPLE)
        )
)
@ApiResponses({
        @ApiResponse(responseCode = "201", description = "Payment initiated",
                content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Not allowed to initiate this payment")
})
public @interface InitiatePaymentDocs {
}
