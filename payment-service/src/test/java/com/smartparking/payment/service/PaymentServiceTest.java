package com.smartparking.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.exception.PaymentStateException;
import com.smartparking.payment.exception.ResourceNotFoundException;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentMethod;
import com.smartparking.payment.model.PaymentStatus;
import com.smartparking.payment.repository.PaymentRepository;
import com.smartparking.payment.support.PaymentTestFixtures;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    private InitiatePaymentRequest initiateRequest;

    @BeforeEach
    void setUp() {
        initiateRequest = new InitiatePaymentRequest(
                1L,
                1L,
                1L,
                new BigDecimal("80.00"),
                "inr",
                PaymentMethod.MOCK
        );
    }

    @Test
    void initiateCreatesPaymentForOwner() {
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            return PaymentTestFixtures.savedPayment(payment, 10L);
        });

        var response = paymentService.initiate(initiateRequest, 1L, false);

        assertThat(response.status()).isEqualTo(PaymentStatus.INITIATED);
        assertThat(response.currency()).isEqualTo("INR");
        assertThat(response.amount()).isEqualByComparingTo("80.00");

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(1L);
        assertThat(captor.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.MOCK);
    }

    @Test
    void initiateDefaultsCurrencyWhenBlank() {
        InitiatePaymentRequest request = new InitiatePaymentRequest(
                1L, 1L, 1L, new BigDecimal("50.00"), "  ", PaymentMethod.MOCK
        );

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            return PaymentTestFixtures.savedPayment(payment, 11L);
        });

        var response = paymentService.initiate(request, 1L, false);

        assertThat(response.currency()).isEqualTo("INR");
    }

    @Test
    void initiateAllowsAdminToCreatePaymentForAnotherUser() {
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            return PaymentTestFixtures.savedPayment(payment, 12L);
        });

        assertThat(paymentService.initiate(initiateRequest, 99L, true).userId()).isEqualTo(1L);
    }

    @Test
    void initiateDeniesAccessForDifferentUser() {
        assertThatThrownBy(() -> paymentService.initiate(initiateRequest, 2L, false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("You can only access your own payments");
    }

    @Test
    void markSuccessUpdatesInitiatedPayment() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(payment)).thenAnswer(invocation -> invocation.getArgument(0));

        var response = paymentService.markSuccess(1L);

        assertThat(response.status()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(response.providerReference()).startsWith("MOCK-");
        assertThat(response.failureReason()).isNull();
    }

    @Test
    void markSuccessIsIdempotentWhenAlreadySuccessful() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.SUCCESS, new BigDecimal("80.00"));
        payment.setProviderReference("MOCK-existing");
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        var response = paymentService.markSuccess(1L);

        assertThat(response.status()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(response.providerReference()).isEqualTo("MOCK-existing");
    }

    @Test
    void markSuccessRejectsFailedPayment() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.FAILED, new BigDecimal("80.00"));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.markSuccess(1L))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("FAILED payment cannot be marked SUCCESS. Create a new payment.");
    }

    @Test
    void markFailureUpdatesInitiatedPayment() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(payment)).thenAnswer(invocation -> invocation.getArgument(0));

        var response = paymentService.markFailure(1L, new MockFailureRequest("Provider declined"));

        assertThat(response.status()).isEqualTo(PaymentStatus.FAILED);
        assertThat(response.failureReason()).isEqualTo("Provider declined");
    }

    @Test
    void markFailureIsIdempotentWhenAlreadyFailed() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.FAILED, new BigDecimal("80.00"));
        payment.setFailureReason("Already failed");
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        var response = paymentService.markFailure(1L, new MockFailureRequest("Ignored"));

        assertThat(response.status()).isEqualTo(PaymentStatus.FAILED);
        assertThat(response.failureReason()).isEqualTo("Already failed");
    }

    @Test
    void markSuccessRejectsRefundedPayment() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.REFUNDED, new BigDecimal("80.00"));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.markSuccess(1L))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("REFUNDED payment cannot be changed.");
    }

    @Test
    void markFailureRejectsRefundedPayment() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.REFUNDED, new BigDecimal("80.00"));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.markFailure(1L, new MockFailureRequest("Too late")))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("REFUNDED payment cannot be changed.");
    }

    @Test
    void markFailureRejectsSuccessfulPayment() {
        Payment payment = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.SUCCESS, new BigDecimal("80.00"));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.markFailure(1L, new MockFailureRequest("Too late")))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("SUCCESS payment cannot be marked FAILED.");
    }

    @Test
    void findByIdAllowsOwnerAccess() {
        Payment payment = PaymentTestFixtures.payment(5L, 7L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        when(paymentRepository.findById(5L)).thenReturn(Optional.of(payment));

        assertThat(paymentService.findById(5L, 7L, false).userId()).isEqualTo(7L);
    }

    @Test
    void findByIdAllowsAdminAccess() {
        Payment payment = PaymentTestFixtures.payment(5L, 7L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        when(paymentRepository.findById(5L)).thenReturn(Optional.of(payment));

        assertThat(paymentService.findById(5L, 99L, true).id()).isEqualTo(5L);
    }

    @Test
    void findByIdDeniesOtherUsers() {
        Payment payment = PaymentTestFixtures.payment(5L, 7L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        when(paymentRepository.findById(5L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.findById(5L, 8L, false))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void findByIdThrowsWhenPaymentMissing() {
        when(paymentRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.findById(404L, 1L, true))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Payment not found");
    }

    @Test
    void findAllReturnsPaymentsInRepositoryOrder() {
        Payment first = PaymentTestFixtures.payment(2L, 1L, PaymentStatus.SUCCESS, new BigDecimal("40.00"));
        Payment second = PaymentTestFixtures.payment(1L, 2L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        when(paymentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(first, second));

        assertThat(paymentService.findAll())
                .extracting(response -> response.id())
                .containsExactly(2L, 1L);
    }

    @Test
    void findByUserIdReturnsOnlyRequestedUserPayments() {
        Payment payment = PaymentTestFixtures.payment(1L, 3L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        when(paymentRepository.findByUserIdOrderByCreatedAtDesc(3L)).thenReturn(List.of(payment));

        assertThat(paymentService.findByUserId(3L, 3L, false))
                .singleElement()
                .extracting(response -> response.userId())
                .isEqualTo(3L);
    }

    @Test
    void summaryAggregatesCountsAndSuccessfulAmount() {
        Payment successful = PaymentTestFixtures.payment(1L, 1L, PaymentStatus.SUCCESS, new BigDecimal("80.00"));
        Payment initiated = PaymentTestFixtures.payment(2L, 2L, PaymentStatus.INITIATED, new BigDecimal("20.00"));
        when(paymentRepository.count()).thenReturn(2L);
        when(paymentRepository.findAll()).thenReturn(List.of(successful, initiated));
        when(paymentRepository.countByStatus(PaymentStatus.INITIATED)).thenReturn(1L);
        when(paymentRepository.countByStatus(PaymentStatus.SUCCESS)).thenReturn(1L);
        when(paymentRepository.countByStatus(PaymentStatus.FAILED)).thenReturn(0L);
        when(paymentRepository.countByStatus(PaymentStatus.REFUNDED)).thenReturn(0L);

        var summary = paymentService.summary();

        assertThat(summary.totalPayments()).isEqualTo(2L);
        assertThat(summary.successfulAmount()).isEqualByComparingTo("80.00");
        assertThat(summary.paymentsByStatus())
                .containsEntry("INITIATED", 1L)
                .containsEntry("SUCCESS", 1L);
    }
}