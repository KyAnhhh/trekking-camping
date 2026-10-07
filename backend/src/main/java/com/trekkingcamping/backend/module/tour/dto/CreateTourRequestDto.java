package com.trekkingcamping.backend.module.tour.dto;

import java.math.BigDecimal;

public class CreateTourRequestDto {
    private String title;
    private String slug;
    private String location;
    private Integer durationDays;
    private Integer durationNights;
    private Integer difficultyLevel;
    private BigDecimal pricePerPax;
    private Integer maxCapacity;
    private String summary;
    private String description;
    private String safetyTips;
    private String insuranceInfo;
    private String emergencyHotline;
    private String requiredGear;

    // BẮT BUỘC có No-args constructor để Jackson parse JSON thành DTO
    public CreateTourRequestDto() {}

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
}