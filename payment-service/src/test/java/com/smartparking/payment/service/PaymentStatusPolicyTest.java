package com.smartparking.payment.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smartparking.payment.exception.PaymentStateException;
import com.smartparking.payment.model.PaymentStatus;
import org.junit.jupiter.api.Test;

class PaymentStatusPolicyTest {
    @Test
    void allowsInitiatedToSuccessAndFailure() {
        assertThatCode(() -> PaymentStatusPolicy.assertCanMarkSuccess(PaymentStatus.INITIATED))
                .doesNotThrowAnyException();
        assertThatCode(() -> PaymentStatusPolicy.assertCanMarkFailure(PaymentStatus.INITIATED))
                .doesNotThrowAnyException();
    }

    @Test
    void blocksInvalidSuccessTransitions() {
        assertThatThrownBy(() -> PaymentStatusPolicy.assertCanMarkSuccess(PaymentStatus.FAILED))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("FAILED payment cannot be marked SUCCESS. Create a new payment.");

        assertThatThrownBy(() -> PaymentStatusPolicy.assertCanMarkSuccess(PaymentStatus.REFUNDED))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("REFUNDED payment cannot be changed.");
    }

    @Test
    void blocksInvalidFailureTransitions() {
        assertThatThrownBy(() -> PaymentStatusPolicy.assertCanMarkFailure(PaymentStatus.SUCCESS))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("SUCCESS payment cannot be marked FAILED.");

        assertThatThrownBy(() -> PaymentStatusPolicy.assertCanMarkFailure(PaymentStatus.REFUNDED))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("REFUNDED payment cannot be changed.");
    }
}