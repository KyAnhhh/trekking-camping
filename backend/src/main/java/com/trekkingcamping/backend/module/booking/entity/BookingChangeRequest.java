package com.trekkingcamping.backend.module.booking.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name="booking_change_requests") @Getter @Setter
public class BookingChangeRequest {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="booking_id",nullable=false) private Long bookingId;
 @Column(name="original_schedule_id",nullable=false) private Long originalScheduleId;
 @Column(name="target_schedule_id") private Long targetScheduleId;
 @Column(nullable=false,length=20) private String type;
 @Column(nullable=false,length=20) private String status;
 @Column(nullable=false,length=1000) private String reason;
 @Column(name="admin_note",length=1000) private String adminNote;
 @Column(name="reviewed_by",length=254) private String reviewedBy;
 @Column(name="quoted_amount",precision=19,scale=2) private BigDecimal quotedAmount;
 @Column(name="target_snapshot",columnDefinition="TEXT") private String targetSnapshot;
 @Column(name="created_at",nullable=false) private LocalDateTime createdAt;
 @Column(name="reviewed_at") private LocalDateTime reviewedAt;
}
