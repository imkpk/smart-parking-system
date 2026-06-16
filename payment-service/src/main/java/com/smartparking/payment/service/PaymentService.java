package com.smartparking.payment.service;

import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.dto.PaymentResponse;
import com.smartparking.payment.dto.PaymentSummaryResponse;
import com.smartparking.payment.exception.ResourceNotFoundException;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentStatus;
import com.smartparking.payment.repository.PaymentRepository;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public PaymentResponse initiate(InitiatePaymentRequest request, Long currentUserId, boolean admin) {
        ensureUserAccess(request.userId(), currentUserId, admin);

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

        if (PaymentStatusPolicy.isSuccessIdempotent(payment.getStatus())) {
            return PaymentResponse.from(payment);
        }

        PaymentStatusPolicy.assertCanMarkSuccess(payment.getStatus());

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setProviderReference("MOCK-" + UUID.randomUUID());
        payment.setFailureReason(null);

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    @Transactional
    public PaymentResponse markFailure(Long id, MockFailureRequest request) {
        Payment payment = findPayment(id);

        if (PaymentStatusPolicy.isFailureIdempotent(payment.getStatus())) {
            return PaymentResponse.from(payment);
        }

        PaymentStatusPolicy.assertCanMarkFailure(payment.getStatus());

        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(request.failureReason());

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    public PaymentResponse findById(Long id, Long currentUserId, boolean admin) {
        Payment payment = findPayment(id);
        ensureUserAccess(payment.getUserId(), currentUserId, admin);
        return PaymentResponse.from(payment);
    }

    public List<PaymentResponse> findAll() {
        return paymentRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(PaymentResponse::from)
                .toList();
    }

    public List<PaymentResponse> findByUserId(Long userId, Long currentUserId, boolean admin) {
        ensureUserAccess(userId, currentUserId, admin);

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

    private void ensureUserAccess(Long resourceUserId, Long currentUserId, boolean admin) {
        if (admin || resourceUserId.equals(currentUserId)) {
            return;
        }

        throw new AccessDeniedException("You can only access your own payments");
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "INR";
        }

        return currency.trim().toUpperCase();
    }
}
