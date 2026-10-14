package com.trekkingcamping.backend.module.tour.dto;

import java.time.LocalDate;

public class CreateScheduleRequestDto {
    private java.time.LocalDateTime pickupAt;
    private String pickupPoint;
    public java.time.LocalDateTime getPickupAt() { return pickupAt; }
    public void setPickupAt(java.time.LocalDateTime value) { pickupAt=value; }
    public String getPickupPoint() { return pickupPoint; }
    public void setPickupPoint(String value) { pickupPoint=value; }
    private LocalDate departureDate;
    private LocalDate returnDate;
    private Integer availableSlots;
    private String guideName;
    private String guidePhone;
    private java.util.List<com.trekkingcamping.backend.module.guide.dto.GuideDtos.Assignment> guideAssignments;
    public java.util.List<com.trekkingcamping.backend.module.guide.dto.GuideDtos.Assignment> getGuideAssignments() { return guideAssignments; }
    public void setGuideAssignments(java.util.List<com.trekkingcamping.backend.module.guide.dto.GuideDtos.Assignment> value) { guideAssignments = value; }

    public CreateScheduleRequestDto() {}

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
}
