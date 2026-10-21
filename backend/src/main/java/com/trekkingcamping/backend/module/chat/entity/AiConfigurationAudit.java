package com.trekkingcamping.backend.module.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name="ai_configuration_audit") @Getter @Setter
public class AiConfigurationAudit {
    @Id private Long revision;
    @Column(nullable=false,columnDefinition="TEXT") private String document;
    @Column(nullable=false) private String changedBy;
    @Column(nullable=false) private Instant changedAt;
}
