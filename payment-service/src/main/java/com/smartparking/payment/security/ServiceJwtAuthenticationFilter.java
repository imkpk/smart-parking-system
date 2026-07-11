package com.smartparking.payment.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collection;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ServiceJwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String INITIATE_PATH = "/api/payments/initiate";
    private static final Set<String> SYSTEM_HEADERS = Set.of(
            "X-Payment-Context",
            "X-Organization-Id",
            "X-Payment-Trigger"
    );

    private final JwtDecoder serviceJwtDecoder;

    public ServiceJwtAuthenticationFilter(
            @Qualifier("serviceJwtDecoder") JwtDecoder serviceJwtDecoder
    ) {
        this.serviceJwtDecoder = serviceJwtDecoder;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod())
                || !INITIATE_PATH.equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        boolean hasSystemHeaders = SYSTEM_HEADERS.stream()
                .anyMatch(header -> StringUtils.hasText(request.getHeader(header)));
        String bearerToken = resolveBearerToken(request);

        if (hasSystemHeaders) {
            if (!authenticateServiceToken(bearerToken)) {
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Valid service JWT required for system payment context"
                );
                return;
            }

            filterChain.doFilter(withoutAuthorizationHeader(request), response);
            return;
        }

        if (bearerToken != null && authenticateServiceToken(bearerToken)) {
            filterChain.doFilter(withoutAuthorizationHeader(request), response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean authenticateServiceToken(String bearerToken) {
        if (!StringUtils.hasText(bearerToken)) {
            return false;
        }

        try {
            Jwt jwt = serviceJwtDecoder.decode(bearerToken);

            if (!AuthUtils.isServiceToken(jwt) || !AuthUtils.hasPaymentInitiateScope(jwt)) {
                return false;
            }

            SecurityContextHolder.getContext().setAuthentication(
                    new JwtAuthenticationToken(jwt, serviceAuthorities(jwt))
            );
            return true;
        } catch (JwtException exception) {
            return false;
        }
    }

    private static Collection<GrantedAuthority> serviceAuthorities(Jwt jwt) {
        List<String> scopes = AuthUtils.scopes(jwt);

        return scopes.stream()
                .map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope))
                .map(GrantedAuthority.class::cast)
                .toList();
    }

    private static String resolveBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
            return null;
        }

        return authorization.substring("Bearer ".length()).trim();
    }

    private static HttpServletRequest withoutAuthorizationHeader(HttpServletRequest request) {
        return new HttpServletRequestWrapper(request) {
            @Override
            public String getHeader(String name) {
                if (HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)) {
                    return null;
                }

                return super.getHeader(name);
            }

            @Override
            public Enumeration<String> getHeaders(String name) {
                if (HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)) {
                    return Collections.emptyEnumeration();
                }

                return super.getHeaders(name);
            }
        };
    }
}