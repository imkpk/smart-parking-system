package com.smartparking.payment.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class AuthUtilsTest {
    @Test
    void userIdReadsNumericSubjectClaim() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("sub", 42)
                .claim("role", "USER")
                .build();

        assertThat(AuthUtils.userId(jwt)).isEqualTo(42L);
    }

    @Test
    void userIdReadsStringSubjectClaim() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("sub", "15")
                .claim("role", "USER")
                .build();

        assertThat(AuthUtils.userId(jwt)).isEqualTo(15L);
    }

    @Test
    void isAdminReturnsTrueOnlyForAdminRole() {
        Jwt admin = jwtWithRole("ADMIN");
        Jwt security = jwtWithRole("SECURITY");

        assertThat(AuthUtils.isAdmin(admin)).isTrue();
        assertThat(AuthUtils.isAdmin(security)).isFalse();
    }

    @Test
    void isAdminOrSecurityRecognizesOperationalRoles() {
        assertThat(AuthUtils.isAdminOrSecurity(jwtWithRole("ADMIN"))).isTrue();
        assertThat(AuthUtils.isAdminOrSecurity(jwtWithRole("SECURITY"))).isTrue();
        assertThat(AuthUtils.isAdminOrSecurity(jwtWithRole("USER"))).isFalse();
    }

    private Jwt jwtWithRole(String role) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("sub", "1")
                .claim("role", role)
                .build();
    }
}