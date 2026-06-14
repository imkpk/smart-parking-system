package com.smartparking.payment.service;

import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.dto.PaymentResponse;
import com.smartparking.payment.dto.PaymentSummaryResponse;
import com.smartparking.payment.exception.PaymentStateException;
import com.smartparking.payment.exception.ResourceNotFoundException;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentStatus;
import com.smartparking.payment.repository.PaymentRepository;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public PaymentResponse initiate(InitiatePaymentRequest request) {
        Payment payment = new Payment();
        payment.setParkingEventId(request.parkingEventId());
        payment.setBookingId(request.bookingId());
        payment.setUserId(request.userId());
        payment.setAmount(request.amount());
        payment.setCurrency(normalizeCurrency(request.currency()));
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setPaymentMethod(request.paymentMethod());

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    @Transactional
    public PaymentResponse markSuccess(Long id) {
        Payment payment = findPayment(id);

        if (payment.getStatus() == PaymentStatus.FAILED) {
            throw new PaymentStateException("FAILED payment cannot be marked SUCCESS. Create a new payment.");
        }

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return PaymentResponse.from(payment);
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setProviderReference("MOCK-" + UUID.randomUUID());
        payment.setFailureReason(null);

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    @Transactional
    public PaymentResponse markFailure(Long id, MockFailureRequest request) {
        Payment payment = findPayment(id);

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new PaymentStateException("SUCCESS payment cannot be marked FAILED.");
        }

        if (payment.getStatus() == PaymentStatus.FAILED) {
            return PaymentResponse.from(payment);
        }

        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(request.failureReason());

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    public PaymentResponse findById(Long id) {
        return PaymentResponse.from(findPayment(id));
    }

    public java.util.List<PaymentResponse> findByUserId(Long userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(PaymentResponse::from)
                .toList();
    }

    public PaymentSummaryResponse summary() {
        Map<String, Long> byStatus = Arrays.stream(PaymentStatus.values())
                .collect(Collectors.toMap(Enum::name, paymentRepository::countByStatus));

        BigDecimal successfulAmount = paymentRepository.findAll()
                .stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.SUCCESS)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PaymentSummaryResponse(paymentRepository.count(), successfulAmount, byStatus);
    }

    private Payment findPayment(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "INR";
        }

        return currency.trim().toUpperCase();
    }
}
