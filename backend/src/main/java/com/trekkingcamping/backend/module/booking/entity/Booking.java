package com.trekkingcamping.backend.module.booking.entity;

import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.user.entity.User;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter 
@Builder
@NoArgsConstructor 
@AllArgsConstructor
@Entity
@Table(name = "bookings", indexes=@Index(name="idx_booking_participation_deadline",columnList="status,participation_deadline"))
public class Booking {
    @Column(name="passenger_revision", nullable=false, columnDefinition="bigint default 0")
    @Builder.Default private Long passengerRevision = 0L;
    // Null denotes a legacy booking created before the participation workflow.
    @Column(name="participation_status") private String participationStatus;
    @Column(name="participation_revision") private Long participationRevision;
    @Column(name="participation_deadline") private LocalDateTime participationDeadline;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_code", unique = true)
    private String bookingCode;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "schedule_id")
    private TourSchedule schedule;

    @Column(name = "number_of_pax")
    private Integer numberOfPax;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "medical_conditions", columnDefinition = "TEXT")
    private String medicalConditions;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(name = "special_requirements", columnDefinition = "TEXT")
    private String specialRequirements;

    private String status; // PENDING, CONFIRMED, CANCELLED

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

}
