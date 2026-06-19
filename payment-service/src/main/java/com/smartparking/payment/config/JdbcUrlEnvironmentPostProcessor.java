package com.smartparking.payment.config;

import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class JdbcUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    static final String DB_URL_PROPERTY = "DB_URL";
    static final String DATASOURCE_URL_PROPERTY = "spring.datasource.url";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String dbUrl = environment.getProperty(DB_URL_PROPERTY);
        if (dbUrl == null || dbUrl.isBlank()) {
            return;
        }

        String normalized = normalizeJdbcUrl(dbUrl.trim());
        Map<String, Object> properties = new HashMap<>();
        properties.put(DATASOURCE_URL_PROPERTY, normalized);
        environment.getPropertySources().addFirst(new MapPropertySource("normalizedDbUrl", properties));
    }

    static String normalizeJdbcUrl(String url) {
        if (url.startsWith("jdbc:")) {
            return url;
        }
        if (url.startsWith("postgresql://")) {
            return "jdbc:" + url;
        }
        if (url.startsWith("postgres://")) {
            return "jdbc:postgresql://" + url.substring("postgres://".length());
        }
        return url;
    }
}