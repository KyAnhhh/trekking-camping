package com.trekkingcamping.backend.module.booking.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

/** Metadata only: never copy names, health notes or decrypted content here. */
@Entity @Table(name="participation_audit") @Getter @Setter
public class ParticipationAudit {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private Long bookingId;
    private Long actorId;
    private Long revision;
    private String action;
    private Instant createdAt = Instant.now();
}
