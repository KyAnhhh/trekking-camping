package com.trekkingcamping.backend.module.planner.service;
import com.trekkingcamping.backend.module.planner.dto.PlanDtos.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.util.*;
@Service
public class PlanCatalog {
    private final TourScheduleRepository schedules; private final TourItineraryRepository itineraries;
    public PlanCatalog(TourScheduleRepository schedules, TourItineraryRepository itineraries) { this.schedules = schedules; this.itineraries = itineraries; }
    @Transactional(readOnly = true) public List<Option> matching(Request r) {
        String search = "%" + r.destination().trim().toLowerCase(Locale.ROOT).replace("%", "").replace("_", "") + "%";
        return schedules.findPlannerOptions(search, r.startDate(), r.startDate().plusDays(r.days() - 1), r.people(),
                r.fitness(), r.budgetPerPerson(), r.maxDistanceKm(), r.maxActiveHoursPerDay(), r.maxMedicalAccessHours(), PageRequest.of(0, 10)).stream().map(s -> {
            var t = s.getTour();
            String itinerary = itineraries.findByTourIdOrderByDayNumberAsc(t.getId()).stream().limit(7)
                    .map(i -> "Ngày " + i.getDayNumber() + ": " + Objects.toString(i.getTitle(), "") + " - "
                            + Objects.toString(i.getDescription(), "").substring(0, Math.min(800, Objects.toString(i.getDescription(), "").length())))
                    .collect(java.util.stream.Collectors.joining("\n"));
            return new Option(t.getId(), s.getId(), t.getTitle(), "/tours/" + t.getSlug() + "/booking?schedule=" + s.getId(),
                    t.getPricePerPax(), s.getDepartureDate(), s.getReturnDate(), s.getAvailableSlots(), itinerary, t.getAdventureProfile());
        }).toList();
    }
}
