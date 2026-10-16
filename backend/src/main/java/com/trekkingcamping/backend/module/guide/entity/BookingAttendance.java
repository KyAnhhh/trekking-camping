package com.trekkingcamping.backend.module.guide.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Entity @Table(name="booking_attendance") @Getter @Setter
public class BookingAttendance {
    @Id private Long bookingId;
    @Column(nullable=false) private int presentCount;
    @Column(nullable=false) private long revision;
    @Column(nullable=false) private Long markedByGuideId;
    @Column(nullable=false) private Instant markedAt;
}
