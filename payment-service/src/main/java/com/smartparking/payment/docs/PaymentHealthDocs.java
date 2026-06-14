package com.smartparking.payment.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Operation(summary = PaymentApiDocs.HEALTH_SUMMARY)
@ApiResponse(responseCode = "200", description = "Payment service is healthy")
public @interface PaymentHealthDocs {
}
