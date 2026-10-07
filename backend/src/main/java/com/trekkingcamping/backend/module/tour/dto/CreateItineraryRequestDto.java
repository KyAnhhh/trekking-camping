package com.trekkingcamping.backend.module.tour.dto;

public class CreateItineraryRequestDto {
    private Integer dayNumber;
    private String title;
    private String description;

    public CreateItineraryRequestDto() {}

    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}