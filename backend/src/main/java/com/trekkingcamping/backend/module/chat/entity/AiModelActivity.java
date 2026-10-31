package com.trekkingcamping.backend.module.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "ai_model_activities")
@Getter
@Setter
public class AiModelActivity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_id", nullable = false, length = 100)
    private String modelId;

    @Column(name = "action_type", length = 50)
    private String actionType; // STREAM_CHAT, CHAT_QUERY, TOOL_CALL, FALLBACK

    @Column(name = "duration_ms")
    private long durationMs;

    @Column(length = 20)
    private String status; // SUCCESS, FAILED

    @Column(name = "error_code", length = 100)
    private String errorCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public AiModelActivity() {}

    public AiModelActivity(String modelId, String actionType, long durationMs, String status, String errorCode) {
        this.modelId = modelId;
        this.actionType = actionType;
        this.durationMs = durationMs;
        this.status = status;
        this.errorCode = errorCode;
        this.createdAt = Instant.now();
    }
}
