package com.smartparking.payment.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.smartparking.payment.PaymentServiceApplication;
import com.smartparking.payment.dto.InitiatePaymentRequest;
import com.smartparking.payment.dto.MockFailureRequest;
import com.smartparking.payment.dto.VerifyPaymentRequest;
import com.smartparking.payment.gateway.RazorpaySignatureVerifier;
import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentMethod;
import com.smartparking.payment.model.PaymentProviderType;
import com.smartparking.payment.model.PaymentStatus;
import com.smartparking.payment.repository.PaymentRepository;
import com.smartparking.payment.support.RazorpayWebhookTestSupport;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = PaymentServiceApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentApiIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PaymentRepository paymentRepository;

    @BeforeEach
    void cleanDatabase() {
        paymentRepository.deleteAll();
    }

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/payments/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ok"));
    }

    @Test
    void initiateRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/payments/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initiatePayload(1L)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void userCanInitiateOwnPayment() throws Exception {
        mockMvc.perform(post("/api/payments/initiate")
                        .with(userJwt(1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initiatePayload(1L)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INITIATED"))
                .andExpect(jsonPath("$.data.userId").value(1))
                .andExpect(jsonPath("$.data.currency").value("INR"))
                .andExpect(jsonPath("$.data.provider").value("MOCK"));
    }

    @Test
    void userCannotInitiatePaymentForAnotherUser() throws Exception {
        mockMvc.perform(post("/api/payments/initiate")
                        .with(userJwt(2L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initiatePayload(1L)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void initiateRejectsInvalidAmount() throws Exception {
        InitiatePaymentRequest request = new InitiatePaymentRequest(
                1L, 1L, 1L, BigDecimal.ZERO, "INR", PaymentMethod.MOCK
        );

        mockMvc.perform(post("/api/payments/initiate")
                        .with(userJwt(1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void adminCanMarkPaymentSuccessAndFailure() throws Exception {
        long paymentId = createPaymentAsUser(1L);

        mockMvc.perform(post("/api/payments/{id}/mock-success", paymentId)
                        .with(adminJwt(99L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.providerReference", startsWith("MOCK-")));

        mockMvc.perform(post("/api/payments/{id}/mock-failure", paymentId)
                        .with(adminJwt(99L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MockFailureRequest("Too late"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("SUCCESS payment cannot be marked FAILED")));
    }

    @Test
    void userCannotMarkMockSuccess() throws Exception {
        long paymentId = createPaymentAsUser(1L);

        mockMvc.perform(post("/api/payments/{id}/mock-success", paymentId)
                        .with(userJwt(1L)))
                .andExpect(status().isForbidden());
    }

    @Test
    void securityCanListAllPayments() throws Exception {
        createPaymentAsUser(1L);
        createPaymentAsUser(2L);

        mockMvc.perform(get("/api/payments")
                        .with(securityJwt(50L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void userCanListOwnPaymentHistory() throws Exception {
        long ownPaymentId = createPaymentAsUser(1L);
        createPaymentAsUser(2L);

        mockMvc.perform(get("/api/payments/user/{userId}", 1L)
                        .with(userJwt(1L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value((int) ownPaymentId));
    }

    @Test
    void userCannotListAnotherUsersPaymentHistory() throws Exception {
        createPaymentAsUser(2L);

        mockMvc.perform(get("/api/payments/user/{userId}", 2L)
                        .with(userJwt(1L)))
                .andExpect(status().isForbidden());
    }

    @Test
    void userCanReadOwnPaymentButNotAnotherUsersPayment() throws Exception {
        long ownPaymentId = createPaymentAsUser(1L);
        long otherPaymentId = createPaymentAsUser(2L);

        mockMvc.perform(get("/api/payments/{id}", ownPaymentId)
                        .with(userJwt(1L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value((int) ownPaymentId));

        mockMvc.perform(get("/api/payments/{id}", otherPaymentId)
                        .with(userJwt(1L)))
                .andExpect(status().isForbidden());
    }

    @Test
    void verifyRejectsMockPayment() throws Exception {
        long paymentId = createPaymentAsUser(1L);

        mockMvc.perform(post("/api/payments/verify")
                        .with(userJwt(1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyPaymentRequest(
                                paymentId,
                                "order_test_123",
                                "pay_test_456",
                                "signature_test"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only Razorpay payments can be verified"));
    }

    @Test
    void verifyMarksRazorpayPaymentSuccess() throws Exception {
        String orderId = "order_test_123";
        String paymentGatewayId = "pay_test_456";
        String secret = "test_secret_key";
        String signature = RazorpaySignatureVerifier.computeSignature(orderId, paymentGatewayId, secret);

        Payment payment = new Payment();
        payment.setParkingEventId(1L);
        payment.setBookingId(1L);
        payment.setUserId(1L);
        payment.setAmount(new BigDecimal("80.00"));
        payment.setCurrency("INR");
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setPaymentMethod(PaymentMethod.MOCK);
        payment.setProvider(PaymentProviderType.RAZORPAY.name());
        payment.setGatewayOrderId(orderId);
        payment.setGatewayStatus("created");
        Payment saved = paymentRepository.save(payment);

        mockMvc.perform(post("/api/payments/verify")
                        .with(userJwt(1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyPaymentRequest(
                                saved.getId(),
                                orderId,
                                paymentGatewayId,
                                signature
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.providerReference").value(paymentGatewayId))
                .andExpect(jsonPath("$.data.gatewayStatus").value("captured"));
    }

    @Test
    void razorpayWebhookDoesNotRequireJwt() throws Exception {
        String orderId = "order_webhook_123";
        String paymentId = "pay_webhook_456";
        String rawBody = RazorpayWebhookTestSupport.capturedPayload(orderId, paymentId);
        String signature = RazorpayWebhookTestSupport.sign(rawBody);

        Payment payment = new Payment();
        payment.setParkingEventId(1L);
        payment.setBookingId(1L);
        payment.setUserId(1L);
        payment.setAmount(new BigDecimal("80.00"));
        payment.setCurrency("INR");
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setPaymentMethod(PaymentMethod.MOCK);
        payment.setProvider(PaymentProviderType.RAZORPAY.name());
        payment.setGatewayOrderId(orderId);
        payment.setGatewayStatus("created");
        paymentRepository.save(payment);

        mockMvc.perform(post("/api/payments/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", signature)
                        .content(rawBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("processed"));

        Payment updated = paymentRepository.findByGatewayOrderId(orderId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(updated.getProviderReference()).isEqualTo(paymentId);
    }

    @Test
    void razorpayWebhookRejectsInvalidSignature() throws Exception {
        String rawBody = RazorpayWebhookTestSupport.capturedPayload("order_bad", "pay_bad");

        mockMvc.perform(post("/api/payments/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "invalid_signature")
                        .content(rawBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid webhook signature"));
    }

    @Test
    void razorpayWebhookIgnoresMockProviderPayment() throws Exception {
        String orderId = "order_mock_123";
        String rawBody = RazorpayWebhookTestSupport.capturedPayload(orderId, "pay_mock_456");
        String signature = RazorpayWebhookTestSupport.sign(rawBody);

        Payment payment = new Payment();
        payment.setParkingEventId(1L);
        payment.setBookingId(1L);
        payment.setUserId(1L);
        payment.setAmount(new BigDecimal("80.00"));
        payment.setCurrency("INR");
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setPaymentMethod(PaymentMethod.MOCK);
        payment.setProvider(PaymentProviderType.MOCK.name());
        payment.setGatewayOrderId(orderId);
        paymentRepository.save(payment);

        mockMvc.perform(post("/api/payments/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", signature)
                        .content(rawBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ignored"));

        Payment unchanged = paymentRepository.findByGatewayOrderId(orderId).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo(PaymentStatus.INITIATED);
    }

    @Test
    void adminCanReadPaymentSummary() throws Exception {
        createPaymentAsUser(1L);

        mockMvc.perform(get("/api/payments/reports/summary")
                        .with(adminJwt(99L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalPayments").value(1))
                .andExpect(jsonPath("$.data.paymentsByStatus.INITIATED").value(1));
    }

    private long createPaymentAsUser(long userId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/payments/initiate")
                        .with(userJwt(userId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initiatePayload(userId)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asLong();
    }

    private static RequestPostProcessor userJwt(long userId) {
        return jwt()
                .jwt(builder -> builder.subject(String.valueOf(userId)).claim("role", "USER"))
                .authorities(new SimpleGrantedAuthority("ROLE_USER"));
    }

    private static RequestPostProcessor adminJwt(long userId) {
        return jwt()
                .jwt(builder -> builder.subject(String.valueOf(userId)).claim("role", "ADMIN"))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static RequestPostProcessor securityJwt(long userId) {
        return jwt()
                .jwt(builder -> builder.subject(String.valueOf(userId)).claim("role", "SECURITY"))
                .authorities(new SimpleGrantedAuthority("ROLE_SECURITY"));
    }

    private String initiatePayload(long userId) throws Exception {
        InitiatePaymentRequest request = new InitiatePaymentRequest(
                1L,
                1L,
                userId,
                new BigDecimal("80.00"),
                "INR",
                PaymentMethod.MOCK
        );
        return objectMapper.writeValueAsString(request);
    }
}