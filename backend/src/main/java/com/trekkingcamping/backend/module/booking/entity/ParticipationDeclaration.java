package com.trekkingcamping.backend.module.booking.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name="participation_declarations",indexes=@Index(name="idx_participation_purge",columnList="purge_after")) @Getter @Setter
public class ParticipationDeclaration {
    @Id @Column(name="booking_id") private Long bookingId;
    @Column(name="encrypted_content",nullable=false,columnDefinition="TEXT") private String encryptedContent;
    @Column(name="purge_after",nullable=false) private Instant purgeAfter;
}
