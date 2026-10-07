package com.trekkingcamping.backend.module.tour.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "tour_itineraries")
public class TourItinerary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    @JsonIgnore // Ngăn lặp vô tận khi convert sang JSON
    private Tour tour;

    @Column(name = "day_number")
    private Integer dayNumber;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public TourItinerary() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Tour getTour() { return tour; }
    public void setTour(Tour tour) { this.tour = tour; }
    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}