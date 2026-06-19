package com.smartparking.payment.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class JdbcUrlEnvironmentPostProcessorTest {

    @Test
    void keepsJdbcUrlUnchanged() {
        String url = "jdbc:postgresql://localhost:5432/parking_payment_db";
        assertEquals(url, JdbcUrlEnvironmentPostProcessor.normalizeJdbcUrl(url));
    }

    @Test
    void prefixesNeonStylePostgresqlUrl() {
        String url = "postgresql://host/db?sslmode=require";
        assertEquals("jdbc:postgresql://host/db?sslmode=require",
                JdbcUrlEnvironmentPostProcessor.normalizeJdbcUrl(url));
    }

    @Test
    void convertsPostgresSchemeToJdbcPostgresql() {
        String url = "postgres://host/db";
        assertEquals("jdbc:postgresql://host/db",
                JdbcUrlEnvironmentPostProcessor.normalizeJdbcUrl(url));
    }
}