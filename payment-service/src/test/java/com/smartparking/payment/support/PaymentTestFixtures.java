package com.smartparking.payment.support;

import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentMethod;
import com.smartparking.payment.model.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.test.util.ReflectionTestUtils;

public final class PaymentTestFixtures {
    private PaymentTestFixtures() {
    }

    public static Payment payment(
            Long id,
            Long userId,
            PaymentStatus status,
            BigDecimal amount
    ) {
        Payment payment = new Payment();
        payment.setParkingEventId(1L);
        payment.setBookingId(1L);
        payment.setUserId(userId);
        payment.setAmount(amount);
        payment.setCurrency("INR");
        payment.setStatus(status);
        payment.setPaymentMethod(PaymentMethod.MOCK);

        LocalDateTime now = LocalDateTime.now();
        ReflectionTestUtils.setField(payment, "id", id);
        ReflectionTestUtils.setField(payment, "createdAt", now);
        ReflectionTestUtils.setField(payment, "updatedAt", now);
        return payment;
    }

    public static Payment savedPayment(Payment payment, Long id) {
        LocalDateTime now = LocalDateTime.now();
        ReflectionTestUtils.setField(payment, "id", id);
        ReflectionTestUtils.setField(payment, "createdAt", now);
        ReflectionTestUtils.setField(payment, "updatedAt", now);
        return payment;
    }
}