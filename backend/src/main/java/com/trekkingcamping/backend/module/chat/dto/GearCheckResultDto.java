package com.trekkingcamping.backend.module.chat.dto;

import java.util.List;

public record GearCheckResultDto(
        String tourTitle,
        String verdict,
        int readinessScore,
        String summary,
        List<DetectedItem> detectedItems,
        List<String> missingItems,
        List<String> safetyAdvice,
        String source,
        Integer tokensConsumed,
        String annotatedImageBase64
) {
    public record DetectedItem(
            String name,
            String status,
            String note,
            Double confidence,
            List<Double> box
    ) {
        public DetectedItem(String name, String status, String note) {
            this(name, status, note, null, null);
        }
    }

    public GearCheckResultDto(
            String tourTitle,
            String verdict,
            int readinessScore,
            String summary,
            List<DetectedItem> detectedItems,
            List<String> missingItems,
            List<String> safetyAdvice
    ) {
        this(tourTitle, verdict, readinessScore, summary, detectedItems, missingItems, safetyAdvice, "TIER2_GEMINI_VISION", 650, null);
    }
}
