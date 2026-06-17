package com.smartparking.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class RazorpayWebhookParser {
    private final ObjectMapper objectMapper;

    public RazorpayWebhookParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public RazorpayWebhookEvent parse(String rawBody) {
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String event = textValue(root, "event");
            JsonNode paymentEntity = root.path("payload").path("payment").path("entity");

            return new RazorpayWebhookEvent(
                    event,
                    textValue(paymentEntity, "order_id"),
                    textValue(paymentEntity, "id"),
                    textValue(paymentEntity, "error_description")
            );
        } catch (Exception exception) {
            return RazorpayWebhookEvent.unknown();
        }
    }

    private String textValue(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }
}