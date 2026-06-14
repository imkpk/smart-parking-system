package com.smartparking.payment.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI paymentServiceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Smart Parking Payment Service API")
                        .description("Standalone payment microservice for Smart Parking")
                        .version("1.0.0"))
                .servers(List.of(new Server()
                        .url("http://localhost:8081")
                        .description("Local payment service")));
    }
}
