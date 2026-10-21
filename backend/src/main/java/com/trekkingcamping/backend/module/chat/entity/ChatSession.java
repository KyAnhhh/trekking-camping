package com.trekkingcamping.backend.module.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name="chat_sessions") @Getter @Setter
public class ChatSession {
    @Id @Column(length=36) private String id;
    private Long userId;
    @Column(nullable=false,length=64) private String secretHash;
    @Column(nullable=false) private Instant expiresAt;
    private Instant busyUntil;
    private Instant nextTurnAt;
    private long turn;
    @Column(length=100) private String selectedModelId;
    @Column(nullable=false,columnDefinition="bigint default 0") private long settingsRevision;
}
