package com.trekkingcamping.backend.module.chat.dto;

import java.util.List;

public record GearCheckResultDto(
        String tourTitle,
        String verdict,
        int readinessScore,
        String summary,
        List<DetectedItem> detectedItems,
        List<String> missingItems,
        List<String> safetyAdvice
) {
    public record DetectedItem(String name, String status, String note) {}
}
