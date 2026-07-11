package com.smartparking.payment.support;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

public final class ServiceJwtTestSupport {
    public static final String SECRET = "test_payment_service_jwt_secret_32ch";
    public static final String ISSUER = "smart-parking-backend";
    public static final String AUDIENCE = "smart-parking-payment-service";

    private ServiceJwtTestSupport() {
    }

    public static String initiateToken(long organizationId, String trigger) {
        return initiateToken(organizationId, trigger, List.of("payment:initiate"));
    }

    public static String initiateToken(long organizationId, String trigger, List<String> scopes) {
        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("smart-parking-backend")
                .issuer(ISSUER)
                .audience(AUDIENCE)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(60)))
                .jwtID(UUID.randomUUID().toString())
                .claim("token_type", "service")
                .claim("scope", scopes)
                .claim("organizationId", organizationId)
                .claim("trigger", trigger)
                .build();

        try {
            SignedJWT signedJwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            signedJwt.sign(new MACSigner(SECRET.getBytes()));
            return signedJwt.serialize();
        } catch (JOSEException exception) {
            throw new IllegalStateException("Failed to sign service JWT", exception);
        }
    }
}