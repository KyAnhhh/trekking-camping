package com.trekkingcamping.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
@ConfigurationProperties(prefix = "gemini")
public class GeminiProperties {
    public static final String DEFAULT_MODEL = "gemini-3.5-flash-lite";
    public static final List<String> DEFAULT_MODELS = List.of(DEFAULT_MODEL, "gemini-3.5-flash");

    private String apiKey = "";
    private List<String> models = DEFAULT_MODELS;
    private int maxAttempts = 3;

    public int getMaxAttempts() { return Math.max(1, Math.min(3, maxAttempts)); }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }

    public String getApiKey() {
        return apiKey == null ? "" : apiKey.trim();
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public List<String> getModels() {
        List<String> configured = models == null ? List.of() : models.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(model -> !model.isEmpty())
                .map(model -> model.startsWith("models/") ? model.substring("models/".length()) : model)
                .distinct()
                .toList();
        return configured.isEmpty() ? DEFAULT_MODELS : configured;
    }

    public void setModels(List<String> models) {
        this.models = models;
    }

    // Return only property names/reasons; never include credential values.
    public String configurationIssue() {
        if (getApiKey().isBlank()) return "GEMINI_API_KEY is missing or blank";
        if (getModels().stream().anyMatch(model -> !model.matches("[a-zA-Z0-9._-]+"))) {
            return "GEMINI_MODELS contains an invalid model identifier";
        }
        return null;
    }
}
