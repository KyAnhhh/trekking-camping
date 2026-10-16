package com.trekkingcamping.backend.module.booking.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name="booking_passengers",uniqueConstraints=@UniqueConstraint(columnNames={"booking_id","position"}))
@Getter @Setter
public class BookingPassenger {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="booking_id",nullable=false) private Booking booking;
    @Column(nullable=false) private int position;
    @Column(nullable=false,length=150) private String fullName;
    @Column(nullable=false,length=20) private String attendanceStatus="NOT_CHECKED";
    @Column(nullable=false) private long revision;
    private Instant markedAt;
}
