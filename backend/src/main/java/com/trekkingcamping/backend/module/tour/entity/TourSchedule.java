package com.trekkingcamping.backend.module.tour.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tour_schedules")
public class TourSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    private Tour tour;

    @Column(name = "departure_date")
    private LocalDate departureDate;

    @Column(name = "return_date")
    private LocalDate returnDate;

    @Column(name = "available_slots")
    private Integer availableSlots;

    @Column(name = "guide_name")
    private String guideName;

    @Column(name = "guide_phone")
    private String guidePhone;

    private String status; // OPEN, FULL, CANCELLED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public TourSchedule() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Tour getTour() { return tour; }
    public void setTour(Tour tour) { this.tour = tour; }
    public LocalDate getDepartureDate() { return departureDate; }
    public void setDepartureDate(LocalDate departureDate) { this.departureDate = departureDate; }
    public LocalDate getReturnDate() { return returnDate; }
    public void setReturnDate(LocalDate returnDate) { this.returnDate = returnDate; }
    public Integer getAvailableSlots() { return availableSlots; }
    public void setAvailableSlots(Integer availableSlots) { this.availableSlots = availableSlots; }
    public String getGuideName() { return guideName; }
    public void setGuideName(String guideName) { this.guideName = guideName; }
    public String getGuidePhone() { return guidePhone; }
    public void setGuidePhone(String guidePhone) { this.guidePhone = guidePhone; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}