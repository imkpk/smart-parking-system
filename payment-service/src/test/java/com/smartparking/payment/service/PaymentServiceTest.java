package com.smartparking.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartparking.payment.config.PaymentProviderProperties;
import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.dto.VerifyPaymentRequest;
import com.smartparking.payment.exception.PaymentGatewayException;
import com.smartparking.payment.exception.PaymentStateException;
import com.smartparking.payment.exception.PaymentVerificationException;
import com.smartparking.payment.exception.ResourceNotFoundException;
import com.smartparking.payment.gateway.GatewayInitiationResult;
import com.smartparking.payment.gateway.PaymentGatewayFactory;
import com.smartparking.payment.gateway.PaymentGatewayProvider;
import com.smartparking.payment.exception.PaymentWebhookException;
import com.smartparking.payment.gateway.RazorpaySignatureVerifier;
import com.smartparking.payment.gateway.RazorpayWebhookEvent;
import com.smartparking.payment.gateway.RazorpayWebhookParser;
import com.smartparking.payment.gateway.RazorpayWebhookVerifier;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentMethod;
import com.smartparking.payment.model.PaymentProviderType;
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

    @Mock
    private PaymentProviderProperties paymentProviderProperties;

    @Mock
    private PaymentGatewayFactory paymentGatewayFactory;

    @Mock
    private PaymentGatewayProvider paymentGatewayProvider;

    @Mock
    private RazorpaySignatureVerifier razorpaySignatureVerifier;

    @Mock
    private RazorpayWebhookVerifier razorpayWebhookVerifier;

    @Mock
    private RazorpayWebhookParser razorpayWebhookParser;

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

    private void stubMockGateway() {
        when(paymentProviderProperties.getProvider()).thenReturn(PaymentProviderType.MOCK);
        when(paymentGatewayFactory.activeProvider()).thenReturn(paymentGatewayProvider);
        when(paymentGatewayProvider.initiate(any(Payment.class))).thenReturn(GatewayInitiationResult.empty());
    }

    @Test
    void initiateCreatesPaymentForOwner() {
        stubMockGateway();
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            return PaymentTestFixtures.savedPayment(payment, 10L);
        });

        var response = paymentService.initiate(initiateRequest, 1L, false);

        assertThat(response.status()).isEqualTo(PaymentStatus.INITIATED);
        assertThat(response.currency()).isEqualTo("INR");
        assertThat(response.amount()).isEqualByComparingTo("80.00");

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues().getFirst().getUserId()).isEqualTo(1L);
        assertThat(captor.getAllValues().getFirst().getPaymentMethod()).isEqualTo(PaymentMethod.MOCK);
        assertThat(captor.getAllValues().getFirst().getProvider()).isEqualTo("MOCK");
    }

    @Test
    void initiateDefaultsCurrencyWhenBlank() {
        stubMockGateway();
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
        stubMockGateway();
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
    void verifyMarksRazorpayPaymentSuccessWithValidSignature() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.INITIATED, "order_test_123");
        VerifyPaymentRequest request = new VerifyPaymentRequest(
                10L,
                "order_test_123",
                "pay_test_456",
                "valid_signature"
        );

        PaymentProviderProperties.Razorpay razorpay = new PaymentProviderProperties.Razorpay();
        razorpay.setKeySecret("test_secret");

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(paymentProviderProperties.hasRazorpaySecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(razorpay);
        when(razorpaySignatureVerifier.verify(
                "order_test_123",
                "pay_test_456",
                "valid_signature",
                "test_secret"
        )).thenReturn(true);
        when(paymentRepository.save(payment)).thenAnswer(invocation -> invocation.getArgument(0));

        var response = paymentService.verify(request, 1L, false);

        assertThat(response.status()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(response.providerReference()).isEqualTo("pay_test_456");
        assertThat(response.gatewayStatus()).isEqualTo("captured");
    }

    @Test
    void verifyRejectsInvalidSignature() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.INITIATED, "order_test_123");
        VerifyPaymentRequest request = new VerifyPaymentRequest(
                10L,
                "order_test_123",
                "pay_test_456",
                "invalid_signature"
        );

        PaymentProviderProperties.Razorpay razorpay = new PaymentProviderProperties.Razorpay();
        razorpay.setKeySecret("test_secret");

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(paymentProviderProperties.hasRazorpaySecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(razorpay);
        when(razorpaySignatureVerifier.verify(
                "order_test_123",
                "pay_test_456",
                "invalid_signature",
                "test_secret"
        )).thenReturn(false);

        assertThatThrownBy(() -> paymentService.verify(request, 1L, false))
                .isInstanceOf(PaymentVerificationException.class)
                .hasMessage("Invalid payment signature");
    }

    @Test
    void verifyRejectsWrongOrderId() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.INITIATED, "order_test_123");
        VerifyPaymentRequest request = new VerifyPaymentRequest(
                10L,
                "order_wrong",
                "pay_test_456",
                "valid_signature"
        );

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.verify(request, 1L, false))
                .isInstanceOf(PaymentVerificationException.class)
                .hasMessage("Order id does not match this payment");
    }

    @Test
    void verifyRejectsNonRazorpayPayment() {
        Payment payment = PaymentTestFixtures.payment(10L, 1L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        payment.setProvider(PaymentProviderType.MOCK.name());
        VerifyPaymentRequest request = new VerifyPaymentRequest(
                10L,
                "order_test_123",
                "pay_test_456",
                "valid_signature"
        );

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.verify(request, 1L, false))
                .isInstanceOf(PaymentVerificationException.class)
                .hasMessage("Only Razorpay payments can be verified");
    }

    @Test
    void verifyIsIdempotentWhenAlreadySuccessful() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.SUCCESS, "order_test_123");
        payment.setProviderReference("pay_test_456");
        VerifyPaymentRequest request = new VerifyPaymentRequest(
                10L,
                "order_test_123",
                "pay_test_456",
                "valid_signature"
        );

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));

        var response = paymentService.verify(request, 1L, false);

        assertThat(response.status()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(response.providerReference()).isEqualTo("pay_test_456");
    }

    @Test
    void verifyBlocksFailedPayment() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.FAILED, "order_test_123");
        VerifyPaymentRequest request = new VerifyPaymentRequest(
                10L,
                "order_test_123",
                "pay_test_456",
                "valid_signature"
        );

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.verify(request, 1L, false))
                .isInstanceOf(PaymentStateException.class)
                .hasMessage("FAILED payment cannot be marked SUCCESS. Create a new payment.");
    }

    @Test
    void verifyRequiresRazorpaySecret() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.INITIATED, "order_test_123");
        VerifyPaymentRequest request = new VerifyPaymentRequest(
                10L,
                "order_test_123",
                "pay_test_456",
                "valid_signature"
        );

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(paymentProviderProperties.hasRazorpaySecret()).thenReturn(false);

        assertThatThrownBy(() -> paymentService.verify(request, 1L, false))
                .isInstanceOf(PaymentGatewayException.class)
                .hasMessage("Razorpay configuration is missing");
    }

    @Test
    void webhookCapturedMarksInitiatedPaymentSuccess() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.INITIATED, "order_test_123");
        String rawBody = "{\"event\":\"payment.captured\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.captured", "order_test_123", "pay_test_456", null)
        );
        when(paymentRepository.findByGatewayOrderId("order_test_123")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(payment)).thenAnswer(invocation -> invocation.getArgument(0));

        var response = paymentService.handleRazorpayWebhook(rawBody, "valid_signature");

        assertThat(response.status()).isEqualTo("processed");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(payment.getProviderReference()).isEqualTo("pay_test_456");
    }

    @Test
    void webhookFailedMarksInitiatedPaymentFailed() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.INITIATED, "order_test_123");
        String rawBody = "{\"event\":\"payment.failed\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.failed", "order_test_123", "pay_test_456", "Card declined")
        );
        when(paymentRepository.findByGatewayOrderId("order_test_123")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(payment)).thenAnswer(invocation -> invocation.getArgument(0));

        var response = paymentService.handleRazorpayWebhook(rawBody, "valid_signature");

        assertThat(response.status()).isEqualTo("processed");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(payment.getFailureReason()).isEqualTo("Card declined");
    }

    @Test
    void webhookRejectsInvalidSignature() {
        String rawBody = "{\"event\":\"payment.captured\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "invalid_signature", "webhook_secret_test")).thenReturn(false);

        assertThatThrownBy(() -> paymentService.handleRazorpayWebhook(rawBody, "invalid_signature"))
                .isInstanceOf(PaymentWebhookException.class)
                .hasMessage("Invalid webhook signature");
    }

    @Test
    void webhookRequiresWebhookSecret() {
        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(false);

        assertThatThrownBy(() -> paymentService.handleRazorpayWebhook("{}", "signature"))
                .isInstanceOf(PaymentGatewayException.class)
                .hasMessage("Razorpay webhook configuration is missing");
    }

    @Test
    void webhookIgnoresUnknownEvent() {
        String rawBody = "{\"event\":\"payment.authorized\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.authorized", "order_test_123", "pay_test_456", null)
        );

        assertThat(paymentService.handleRazorpayWebhook(rawBody, "valid_signature").status()).isEqualTo("ignored");
    }

    @Test
    void webhookCapturedIsIdempotentForSuccessfulPayment() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.SUCCESS, "order_test_123");
        payment.setProviderReference("pay_test_456");
        String rawBody = "{\"event\":\"payment.captured\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.captured", "order_test_123", "pay_test_456", null)
        );
        when(paymentRepository.findByGatewayOrderId("order_test_123")).thenReturn(Optional.of(payment));

        assertThat(paymentService.handleRazorpayWebhook(rawBody, "valid_signature").status()).isEqualTo("processed");
    }

    @Test
    void webhookFailedIsIdempotentForFailedPayment() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.FAILED, "order_test_123");
        payment.setFailureReason("Already failed");
        String rawBody = "{\"event\":\"payment.failed\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.failed", "order_test_123", "pay_test_456", "Ignored")
        );
        when(paymentRepository.findByGatewayOrderId("order_test_123")).thenReturn(Optional.of(payment));

        assertThat(paymentService.handleRazorpayWebhook(rawBody, "valid_signature").status()).isEqualTo("processed");
    }

    @Test
    void webhookCapturedIgnoresFailedPayment() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.FAILED, "order_test_123");
        String rawBody = "{\"event\":\"payment.captured\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.captured", "order_test_123", "pay_test_456", null)
        );
        when(paymentRepository.findByGatewayOrderId("order_test_123")).thenReturn(Optional.of(payment));

        assertThat(paymentService.handleRazorpayWebhook(rawBody, "valid_signature").status()).isEqualTo("ignored");
    }

    @Test
    void webhookFailedIgnoresSuccessfulPayment() {
        Payment payment = PaymentTestFixtures.razorpayPayment(10L, 1L, PaymentStatus.SUCCESS, "order_test_123");
        String rawBody = "{\"event\":\"payment.failed\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.failed", "order_test_123", "pay_test_456", "Too late")
        );
        when(paymentRepository.findByGatewayOrderId("order_test_123")).thenReturn(Optional.of(payment));

        assertThat(paymentService.handleRazorpayWebhook(rawBody, "valid_signature").status()).isEqualTo("ignored");
    }

    @Test
    void webhookIgnoresMockProviderPayment() {
        Payment payment = PaymentTestFixtures.payment(10L, 1L, PaymentStatus.INITIATED, new BigDecimal("80.00"));
        payment.setProvider(PaymentProviderType.MOCK.name());
        payment.setGatewayOrderId("order_test_123");
        String rawBody = "{\"event\":\"payment.captured\"}";

        when(paymentProviderProperties.hasRazorpayWebhookSecret()).thenReturn(true);
        when(paymentProviderProperties.getRazorpay()).thenReturn(webhookProperties());
        when(razorpayWebhookVerifier.verify(rawBody, "valid_signature", "webhook_secret_test")).thenReturn(true);
        when(razorpayWebhookParser.parse(rawBody)).thenReturn(
                new RazorpayWebhookEvent("payment.captured", "order_test_123", "pay_test_456", null)
        );
        when(paymentRepository.findByGatewayOrderId("order_test_123")).thenReturn(Optional.of(payment));

        assertThat(paymentService.handleRazorpayWebhook(rawBody, "valid_signature").status()).isEqualTo("ignored");
    }

    private PaymentProviderProperties.Razorpay webhookProperties() {
        PaymentProviderProperties.Razorpay razorpay = new PaymentProviderProperties.Razorpay();
        razorpay.setWebhookSecret("webhook_secret_test");
        return razorpay;
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