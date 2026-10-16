package com.trekkingcamping.backend.module.guide.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

/** One current invitation per guide; credentials are stored only as a SHA-256 digest. */
@Entity @Table(name="guide_invitations") @Getter @Setter
public class GuideInvitation {
    @Id private Long guideId;
    @Column(nullable=false,length=254) private String email;
    @Column(unique=true,length=64) private String tokenHash;
    @Column(nullable=false,length=20) private String status;
    private Instant sentAt;
    private Instant expiresAt;
    private Instant acceptedAt;
    private Instant windowStart;
    private int sendsInWindow;
    private Long invitedBy;
}
