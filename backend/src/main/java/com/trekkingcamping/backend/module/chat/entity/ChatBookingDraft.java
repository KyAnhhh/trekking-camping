package com.trekkingcamping.backend.module.chat.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.*;
@Entity @Table(name="chat_booking_drafts") @Getter @Setter
public class ChatBookingDraft {
    @Id @Column(length=36) private String id;
    @Column(nullable=false) private Long userId;
    @Column(nullable=false) private Long scheduleId;
    private int people;
    private BigDecimal unitPrice;
    private LocalDate departureDate;
    private LocalDate returnDate;
    private LocalDateTime tourUpdatedAt;
    private LocalDateTime pickupAt;
    @Column(length=500) private String pickupPoint;
    private Instant expiresAt;
    @Column(unique=true) private Long bookingId;
    @Column(length=64) private String confirmationHash;
}
