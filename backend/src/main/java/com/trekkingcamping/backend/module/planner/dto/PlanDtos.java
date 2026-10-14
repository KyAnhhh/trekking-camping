package com.trekkingcamping.backend.module.planner.dto;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
public final class PlanDtos {
    private PlanDtos() {}
    public record Request(String destination, LocalDate startDate, Integer days, Integer people,
                          BigDecimal budgetPerPerson, Integer fitness, String preferences,
                          BigDecimal maxDistanceKm, BigDecimal maxActiveHoursPerDay, BigDecimal maxMedicalAccessHours) {
        public Request(String destination,LocalDate startDate,Integer days,Integer people,BigDecimal budget,Integer fitness,String preferences) {
            this(destination,startDate,days,people,budget,fitness,preferences,null,null,null);
        }
    }
    public record Day(int day, String title, String morning, String afternoon, String evening) {}
    public record Generated(String title, String summary, List<Day> days, List<String> tips, List<Long> recommendedTourIds) {}
    public record Option(Long tourId, Long scheduleId, String title, String url, BigDecimal pricePerPerson,
                         LocalDate departureDate, LocalDate returnDate, int availableSlots, String itinerary,
                         com.trekkingcamping.backend.module.tour.entity.AdventureProfile adventureProfile) {
        public Option(Long tourId,Long scheduleId,String title,String url,BigDecimal price,LocalDate departure,LocalDate returns,int slots,String itinerary) {
            this(tourId,scheduleId,title,url,price,departure,returns,slots,itinerary,null);
        }
    }
    public record Content(Request request, Generated itinerary, List<Option> tours, Instant quotedAt) {}
    public record Summary(Long id, String title, Instant createdAt) {}
    public record Detail(Long id, String title, Instant createdAt, Content content) {}
}
