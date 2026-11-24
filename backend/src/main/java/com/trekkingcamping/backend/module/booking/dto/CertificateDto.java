package com.trekkingcamping.backend.module.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateDto {
    private String certificateCode;
    private Long bookingId;
    private String bookingCode;
    private Long passengerId;
    private Integer position;
    private String recipientName;
    private String tourTitle;
    private String destination;
    private LocalDate departureDate;
    private LocalDate returnDate;
    private Integer durationDays;
    private Integer durationNights;
    private BigDecimal distanceKm;
    private Integer maxAltitudeM;
    private Integer totalAscentM;
    private Integer difficultyLevel;
    private String badgeRank; // GOLD, SILVER, BRONZE
    private String badgeTitle;
    private String leadGuideName;
    private String issuedDate;
    private String verificationUrl;
    private boolean eligible;
}
