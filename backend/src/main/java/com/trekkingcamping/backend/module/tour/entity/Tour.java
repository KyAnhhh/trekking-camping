package com.trekkingcamping.backend.module.tour.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tours")
public class Tour {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    
    @Column(unique = true)
    private String slug;

    private String location;

    @Transient
    private String bannerUrl;
    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "duration_nights")
    private Integer durationNights;

    @Column(name = "difficulty_level")
    private Integer difficultyLevel;

    @Column(name = "price_per_pax")
    private BigDecimal pricePerPax;

    @Column(name = "max_capacity")
    private Integer maxCapacity;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "safety_tips", columnDefinition = "TEXT")
    private String safetyTips;

    @Column(name = "insurance_info", columnDefinition = "TEXT")
    private String insuranceInfo;

    @Column(name = "emergency_hotline")
    private String emergencyHotline;

    @Column(name = "required_gear", columnDefinition = "TEXT")
    private String requiredGear;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Tour() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }
    public Integer getDurationNights() { return durationNights; }
    public void setDurationNights(Integer durationNights) { this.durationNights = durationNights; }
    public Integer getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(Integer difficultyLevel) { this.difficultyLevel = difficultyLevel; }
    public BigDecimal getPricePerPax() { return pricePerPax; }
    public void setPricePerPax(BigDecimal pricePerPax) { this.pricePerPax = pricePerPax; }
    public Integer getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Integer maxCapacity) { this.maxCapacity = maxCapacity; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSafetyTips() { return safetyTips; }
    public void setSafetyTips(String safetyTips) { this.safetyTips = safetyTips; }
    public String getInsuranceInfo() { return insuranceInfo; }
    public void setInsuranceInfo(String insuranceInfo) { this.insuranceInfo = insuranceInfo; }
    public String getEmergencyHotline() { return emergencyHotline; }
    public void setEmergencyHotline(String emergencyHotline) { this.emergencyHotline = emergencyHotline; }
    public String getRequiredGear() { return requiredGear; }
    public void setRequiredGear(String requiredGear) { this.requiredGear = requiredGear; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
