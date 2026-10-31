package com.trekkingcamping.backend.module.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "ai_model_metrics")
@Getter
@Setter
public class AiModelMetric {
    @Id
    @Column(name = "model_id", length = 100)
    private String modelId;

    @Column(nullable = false)
    private long calls;

    @Column(nullable = false)
    private long failures;

    @Column(name = "total_millis", nullable = false)
    private long totalMillis;

    @Column(name = "last_error", length = 255)
    private String lastError;

    @Column(name = "last_call")
    private Instant lastCall;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public AiModelMetric() {}

    public AiModelMetric(String modelId, long calls, long failures, long totalMillis, String lastError, Instant lastCall) {
        this.modelId = modelId;
        this.calls = calls;
        this.failures = failures;
        this.totalMillis = totalMillis;
        this.lastError = lastError;
        this.lastCall = lastCall;
        this.updatedAt = Instant.now();
    }
}
