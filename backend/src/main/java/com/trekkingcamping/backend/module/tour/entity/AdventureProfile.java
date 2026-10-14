package com.trekkingcamping.backend.module.tour.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Public, operator-supplied route facts. Null means unknown, never zero. */
@Embeddable
@Data
public class AdventureProfile {
    @Column(name="trek_distance_km") private BigDecimal distanceKm;
    @Column(name="trek_max_altitude_m") private Integer maxAltitudeM;
    @Column(name="trek_total_ascent_m") private Integer totalAscentM;
    @Column(name="trek_active_hours") private BigDecimal activeHoursPerDay;
    @Column(name="trek_medical_hours") private BigDecimal medicalAccessHours;
    @Column(name="trek_medical_notes", columnDefinition="TEXT") private String medicalAccessNotes;
    @Column(name="trek_months") private String recommendedMonths;
    @Column(name="trek_pickup", columnDefinition="TEXT") private String pickupNotes;
    @Column(name="trek_assembly") private String assemblyPoint;
    @Column(name="trek_customers_per_guide") private Integer customersPerGuide;
    @Column(name="trek_requirements", columnDefinition="TEXT") private String participationRequirements;
    @Column(name="trek_source", columnDefinition="TEXT") private String sourceNote;
    @Column(name="trek_verified_on") private LocalDate verifiedOn;
    public boolean sameAs(AdventureProfile other) { return other!=null && comparison().equals(other.comparison()); }
    private java.util.List<Object> comparison() {
        return java.util.Arrays.asList(number(distanceKm),maxAltitudeM,totalAscentM,number(activeHoursPerDay),number(medicalAccessHours),
                medicalAccessNotes,recommendedMonths,pickupNotes,assemblyPoint,customersPerGuide,participationRequirements,sourceNote,verifiedOn);
    }
    private BigDecimal number(BigDecimal n) { return n==null?null:n.stripTrailingZeros(); }
}
