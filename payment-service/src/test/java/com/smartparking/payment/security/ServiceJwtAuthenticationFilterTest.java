package com.smartparking.payment.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.smartparking.payment.support.ServiceJwtTestSupport;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

class ServiceJwtAuthenticationFilterTest {
    private JwtDecoder serviceJwtDecoder;
    private ServiceJwtAuthenticationFilter filter;
    private MockHttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        serviceJwtDecoder = buildServiceJwtDecoder();
        filter = new ServiceJwtAuthenticationFilter(serviceJwtDecoder);
        response = new MockHttpServletResponse();
        filterChain = org.mockito.Mockito.mock(FilterChain.class);
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesValidServiceJwtForInitiate() throws Exception {
        MockHttpServletRequest request = initiateRequest(
                "Bearer " + ServiceJwtTestSupport.initiateToken(42L, "iot-checkout")
        );

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verify(filterChain).doFilter(any(HttpServletRequest.class), eq(response));
    }

    @Test
    void rejectsSystemHeadersWithoutValidServiceJwt() throws Exception {
        MockHttpServletRequest request = initiateRequest(null);
        request.addHeader("X-Payment-Context", "system");
        request.addHeader("X-Organization-Id", "42");

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    void passesThroughNonInitiateRequests() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/payments/health");

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void passesThroughWhenBearerIsNotAServiceJwt() throws Exception {
        MockHttpServletRequest request = initiateRequest("Bearer not-a-service-jwt");

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    private static JwtDecoder buildServiceJwtDecoder() {
        SecretKeySpec secretKey = new SecretKeySpec(
                ServiceJwtTestSupport.SECRET.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        );
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(ServiceJwtTestSupport.ISSUER),
                new JwtClaimValidator<List<String>>(
                        JwtClaimNames.AUD,
                        audiences -> audiences != null
                                && audiences.contains(ServiceJwtTestSupport.AUDIENCE)
                )
        ));
        return decoder;
    }

    private static MockHttpServletRequest initiateRequest(String authorization) {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST",
                "/api/payments/initiate"
        );
        request.setContentType("application/json");
        request.setContent("{}".getBytes(StandardCharsets.UTF_8));

        if (authorization != null) {
            request.addHeader("Authorization", authorization);
        }

        return request;
    }
}