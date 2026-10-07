package com.trekkingcamping.backend.module.tour.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class TourResponseDto {
    private Long id;
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
    private Boolean isActive;
    
    private List<String> images;
    private List<ItineraryDto> itineraries;
    private List<ScheduleDto> activeSchedules;

    @Data
    @Builder
    public static class ItineraryDto {
        private Long id;
        private Integer dayNumber;
        private String title;
        private String description;
    }

    @Data
    @Builder
    public static class ScheduleDto {
        private Long id;
        private String departureDate;
        private String returnDate;
        private Integer availableSlots;
        private String guideName;
        private String guidePhone;
        private String status;
    }
}