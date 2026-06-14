package com.smartparking.payment.docs;

import com.smartparking.payment.dto.PaymentResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Operation(summary = PaymentApiDocs.FIND_BY_ID_SUMMARY)
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "Payment details",
                content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "Payment owner or ADMIN is required"),
        @ApiResponse(responseCode = "404", description = "Payment not found")
})
public @interface GetPaymentDocs {
}
