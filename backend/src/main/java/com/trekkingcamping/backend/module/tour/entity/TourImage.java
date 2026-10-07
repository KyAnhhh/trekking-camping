package com.trekkingcamping.backend.module.tour.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tour_images")
public class TourImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    private Tour tour;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_cover")
    private Boolean isCover = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public TourImage() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Tour getTour() { return tour; }
    public void setTour(Tour tour) { this.tour = tour; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public Boolean getIsCover() { return isCover; }
    public void setIsCover(Boolean isCover) { this.isCover = isCover; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}