package com.smartparking.payment.docs;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Tag(name = PaymentApiDocs.TAG, description = PaymentApiDocs.TAG_DESCRIPTION)
public @interface PaymentApi {
}
