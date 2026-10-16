package com.trekkingcamping.backend.module.booking.entity;
import com.trekkingcamping.backend.module.guide.entity.Guide;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name="passenger_attendance_audit",indexes=@Index(name="idx_passenger_audit_booking",columnList="booking_id,id"),uniqueConstraints=@UniqueConstraint(columnNames={"passenger_id","revision"}))
@Getter @Setter
public class PassengerAttendanceAudit {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="booking_id",nullable=false) private Booking booking;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="passenger_id",nullable=false) private BookingPassenger passenger;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="guide_id",nullable=false) private Guide guide;
    @Column(nullable=false,length=20) private String previousStatus;
    @Column(nullable=false,length=20) private String status;
    @Column(nullable=false) private long revision;
    @Column(nullable=false) private Instant createdAt;
}
