package com.smartparking.payment.security;

import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;

public final class AuthUtils {
    private static final String SERVICE_TOKEN_TYPE = "service";
    private static final String PAYMENT_INITIATE_SCOPE = "payment:initiate";

    private AuthUtils() {
    }

    public static Long userId(Jwt jwt) {
        Object subject = jwt.getClaim("sub");

        if (subject instanceof Number number) {
            return number.longValue();
        }

        return Long.valueOf(String.valueOf(subject));
    }

    public static boolean isAdmin(Jwt jwt) {
        return "ADMIN".equals(jwt.getClaimAsString("role"));
    }

    public static boolean isAdminOrSecurity(Jwt jwt) {
        String role = jwt.getClaimAsString("role");
        return "ADMIN".equals(role) || "SECURITY".equals(role);
    }

    public static boolean isServiceToken(Jwt jwt) {
        return SERVICE_TOKEN_TYPE.equals(jwt.getClaimAsString("token_type"));
    }

    public static boolean hasPaymentInitiateScope(Jwt jwt) {
        return scopes(jwt).contains(PAYMENT_INITIATE_SCOPE);
    }

    public static List<String> scopes(Jwt jwt) {
        Object scopeClaim = jwt.getClaim("scope");

        if (scopeClaim instanceof List<?> scopeList) {
            return scopeList.stream()
                    .map(String::valueOf)
                    .toList();
        }

        if (scopeClaim instanceof String scopeString && !scopeString.isBlank()) {
            return List.of(scopeString.split(" "));
        }

        return List.of();
    }

    public static Long organizationId(Jwt jwt) {
        Object claim = jwt.getClaim("organizationId");

        if (claim instanceof Number number) {
            return number.longValue();
        }

        if (claim == null) {
            throw new IllegalStateException("Service JWT is missing organizationId claim");
        }

        return Long.valueOf(String.valueOf(claim));
    }

    public static String trigger(Jwt jwt) {
        String trigger = jwt.getClaimAsString("trigger");

        if (trigger == null || trigger.isBlank()) {
            throw new IllegalStateException("Service JWT is missing trigger claim");
        }

        return trigger;
    }
}
