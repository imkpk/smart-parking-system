package com.smartparking.payment.service;

import com.smartparking.payment.exception.PaymentStateException;
import com.smartparking.payment.model.PaymentStatus;

public final class PaymentStatusPolicy {
    private PaymentStatusPolicy() {
    }

    public static boolean isSuccessIdempotent(PaymentStatus status) {
        return status == PaymentStatus.SUCCESS;
    }

    public static boolean isFailureIdempotent(PaymentStatus status) {
        return status == PaymentStatus.FAILED;
    }

    public static void assertCanMarkSuccess(PaymentStatus status) {
        if (status == PaymentStatus.FAILED) {
            throw new PaymentStateException("FAILED payment cannot be marked SUCCESS. Create a new payment.");
        }

        if (status == PaymentStatus.REFUNDED) {
            throw new PaymentStateException("REFUNDED payment cannot be changed.");
        }

        if (status != PaymentStatus.INITIATED) {
            throw new PaymentStateException("Only INITIATED payments can be marked SUCCESS.");
        }
    }

    public static void assertCanMarkFailure(PaymentStatus status) {
        if (status == PaymentStatus.SUCCESS) {
            throw new PaymentStateException("SUCCESS payment cannot be marked FAILED.");
        }

        if (status == PaymentStatus.REFUNDED) {
            throw new PaymentStateException("REFUNDED payment cannot be changed.");
        }

        if (status != PaymentStatus.INITIATED) {
            throw new PaymentStateException("Only INITIATED payments can be marked FAILED.");
        }
    }
}