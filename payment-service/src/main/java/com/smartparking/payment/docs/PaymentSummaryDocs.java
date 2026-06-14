package com.smartparking.payment.docs;

import com.smartparking.payment.dto.PaymentSummaryResponse;
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
@Operation(summary = PaymentApiDocs.SUMMARY_REPORT_SUMMARY)
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "Payment summary",
                content = @Content(schema = @Schema(implementation = PaymentSummaryResponse.class))),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "ADMIN role is required")
})
public @interface PaymentSummaryDocs {
}
