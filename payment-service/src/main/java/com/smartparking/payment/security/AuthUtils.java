package com.smartparking.payment.security;

import org.springframework.security.oauth2.jwt.Jwt;

public final class AuthUtils {
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
}
