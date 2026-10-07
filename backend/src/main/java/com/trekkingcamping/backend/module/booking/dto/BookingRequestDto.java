package com.trekkingcamping.backend.module.booking.dto;

public class BookingRequestDto {
    private Long scheduleId;
    private Integer numberOfPax;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private String medicalConditions;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String specialRequirements;

    // Default Constructor (Rất quan trọng để Jackson deserialize JSON từ Frontend)
    public BookingRequestDto() {
    }

    // All-args Constructor
    public BookingRequestDto(Long scheduleId, Integer numberOfPax, String contactName, String contactEmail, 
                             String contactPhone, String medicalConditions, String emergencyContactName, 
                             String emergencyContactPhone, String specialRequirements) {
        this.scheduleId = scheduleId;
        this.numberOfPax = numberOfPax;
        this.contactName = contactName;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.medicalConditions = medicalConditions;
        this.emergencyContactName = emergencyContactName;
        this.emergencyContactPhone = emergencyContactPhone;
        this.specialRequirements = specialRequirements;
    }

    // Getters and Setters
    public Long getScheduleId() {
        return scheduleId;
    }

    public void setScheduleId(Long scheduleId) {
        this.scheduleId = scheduleId;
    }

    public Integer getNumberOfPax() {
        return numberOfPax;
    }

    public void setNumberOfPax(Integer numberOfPax) {
        this.numberOfPax = numberOfPax;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getMedicalConditions() {
        return medicalConditions;
    }

    public void setMedicalConditions(String medicalConditions) {
        this.medicalConditions = medicalConditions;
    }

    public String getEmergencyContactName() {
        return emergencyContactName;
    }

    public void setEmergencyContactName(String emergencyContactName) {
        this.emergencyContactName = emergencyContactName;
    }

    public String getEmergencyContactPhone() {
        return emergencyContactPhone;
    }

    public void setEmergencyContactPhone(String emergencyContactPhone) {
        this.emergencyContactPhone = emergencyContactPhone;
    }

    public String getSpecialRequirements() {
        return specialRequirements;
    }

    public void setSpecialRequirements(String specialRequirements) {
        this.specialRequirements = specialRequirements;
    }
}