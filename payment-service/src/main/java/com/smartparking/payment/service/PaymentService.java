package com.smartparking.payment.service;

import com.smartparking.payment.config.PaymentProviderProperties;
import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.dto.PaymentResponse;
import com.smartparking.payment.dto.PaymentSummaryResponse;
import com.smartparking.payment.dto.VerifyPaymentRequest;
import com.smartparking.payment.exception.PaymentGatewayException;
import com.smartparking.payment.exception.PaymentVerificationException;
import com.smartparking.payment.exception.ResourceNotFoundException;
import com.smartparking.payment.gateway.GatewayInitiationResult;
import com.smartparking.payment.gateway.PaymentGatewayFactory;
import com.smartparking.payment.gateway.RazorpaySignatureVerifier;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentProviderType;
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
    private final PaymentProviderProperties paymentProviderProperties;
    private final PaymentGatewayFactory paymentGatewayFactory;
    private final RazorpaySignatureVerifier razorpaySignatureVerifier;

    public PaymentService(
            PaymentRepository paymentRepository,
            PaymentProviderProperties paymentProviderProperties,
            PaymentGatewayFactory paymentGatewayFactory,
            RazorpaySignatureVerifier razorpaySignatureVerifier
    ) {
        this.paymentRepository = paymentRepository;
        this.paymentProviderProperties = paymentProviderProperties;
        this.paymentGatewayFactory = paymentGatewayFactory;
        this.razorpaySignatureVerifier = razorpaySignatureVerifier;
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
        payment.setProvider(paymentProviderProperties.getProvider().name());

        Payment savedPayment = paymentRepository.save(payment);
        GatewayInitiationResult gatewayResult = paymentGatewayFactory
                .activeProvider()
                .initiate(savedPayment);

        savedPayment.setGatewayOrderId(gatewayResult.gatewayOrderId());
        savedPayment.setGatewayStatus(gatewayResult.gatewayStatus());

        return PaymentResponse.from(paymentRepository.save(savedPayment));
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
    public PaymentResponse verify(VerifyPaymentRequest request, Long currentUserId, boolean admin) {
        Payment payment = findPayment(request.paymentId());
        ensureUserAccess(payment.getUserId(), currentUserId, admin);

        if (PaymentStatusPolicy.isSuccessIdempotent(payment.getStatus())) {
            return PaymentResponse.from(payment);
        }

        PaymentStatusPolicy.assertCanMarkSuccess(payment.getStatus());
        assertRazorpayPayment(payment);
        assertMatchingOrderId(payment, request.razorpayOrderId());
        assertRazorpaySecretConfigured();

        if (!razorpaySignatureVerifier.verify(
                request.razorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature(),
                paymentProviderProperties.getRazorpay().getKeySecret()
        )) {
            throw new PaymentVerificationException("Invalid payment signature");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setGatewayPaymentId(request.razorpayPaymentId());
        payment.setGatewaySignature(request.razorpaySignature());
        payment.setGatewayStatus("captured");
        payment.setProviderReference(request.razorpayPaymentId());
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

    private void assertRazorpayPayment(Payment payment) {
        if (!PaymentProviderType.RAZORPAY.name().equals(payment.getProvider())) {
            throw new PaymentVerificationException("Only Razorpay payments can be verified");
        }
    }

    private void assertMatchingOrderId(Payment payment, String razorpayOrderId) {
        if (payment.getGatewayOrderId() == null || !payment.getGatewayOrderId().equals(razorpayOrderId)) {
            throw new PaymentVerificationException("Order id does not match this payment");
        }
    }

    private void assertRazorpaySecretConfigured() {
        if (!paymentProviderProperties.hasRazorpaySecret()) {
            throw new PaymentGatewayException("Razorpay configuration is missing");
        }
    }
}
