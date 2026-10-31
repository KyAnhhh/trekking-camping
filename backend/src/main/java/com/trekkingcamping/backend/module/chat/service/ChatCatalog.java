package com.trekkingcamping.backend.module.chat.service;

import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class ChatCatalog {
    public record Filter(String destination,LocalDate departure,Integer days,Integer people,Integer fitness,
            BigDecimal budgetPerPerson,BigDecimal maxDistanceKm,BigDecimal maxActiveHoursPerDay,BigDecimal maxMedicalAccessHours) {}

    public record Option(Long tourId, Long scheduleId, String title, String slug, String bannerUrl, String location,
            String url, LocalDate departureDate, LocalDate returnDate,
            BigDecimal pricePerPerson, int availableSlots, int difficulty, Integer durationDays,
            boolean previouslyCompleted, AdventureProfile adventureProfile) {

        // Backward-compatible constructor for existing tests and components
        public Option(Long tourId, Long scheduleId, String title, String url, LocalDate departureDate, LocalDate returnDate,
                BigDecimal pricePerPerson, int availableSlots, int difficulty, boolean previouslyCompleted, AdventureProfile adventureProfile) {
            this(tourId, scheduleId, title, null, null, null, url, departureDate, returnDate, pricePerPerson, availableSlots, difficulty, null, previouslyCompleted, adventureProfile);
        }
    }

    private final EntityManager em;
    private final BookingRepository bookings;
    public ChatCatalog(EntityManager em,BookingRepository bookings) { this.em=em; this.bookings=bookings; }

    @Transactional(readOnly=true,timeout=5)
    public List<Option> search(Filter f,Long userId) {
        if(f==null) f=new Filter(null,null,null,null,null,null,null,null,null);
        validate(f);
        int people=f.people()==null?1:f.people();
        List<Long> visited=userId==null?List.of():bookings.completedTourIds(userId);
        var cb=em.getCriteriaBuilder(); var q=cb.createQuery(TourSchedule.class); var s=q.from(TourSchedule.class);
        s.fetch("tour"); var t=s.<Tour>get("tour");
        var p=new ArrayList<Predicate>();
        p.add(cb.isTrue(t.get("isActive"))); p.add(cb.equal(s.get("status"),"OPEN"));
        p.add(cb.greaterThan(s.get("departureDate"),LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))));
        p.add(cb.ge(s.get("availableSlots"),people)); p.add(cb.ge(t.get("pricePerPax"),0));
        if(f.destination()!=null && !f.destination().isBlank()) {
            String match="%"+f.destination().trim().toLowerCase(Locale.ROOT).replace("%","").replace("_","")+"%";
            p.add(cb.or(cb.like(cb.lower(t.get("title")),match),cb.like(cb.lower(t.get("location")),match)));
        }
        if(f.departure()!=null) p.add(cb.equal(s.get("departureDate"),f.departure()));
        if(f.days()!=null) p.add(cb.equal(t.get("durationDays"),f.days()));
        if(f.fitness()!=null) p.add(cb.le(t.get("difficultyLevel"),f.fitness()));
        if(f.budgetPerPerson()!=null) p.add(cb.le(t.get("pricePerPax"),f.budgetPerPerson()));
        if(f.maxDistanceKm()!=null) p.add(cb.le(t.get("adventureProfile").get("distanceKm"),f.maxDistanceKm()));
        if(f.maxActiveHoursPerDay()!=null) p.add(cb.le(t.get("adventureProfile").get("activeHoursPerDay"),f.maxActiveHoursPerDay()));
        if(f.maxMedicalAccessHours()!=null) p.add(cb.le(t.get("adventureProfile").get("medicalAccessHours"),f.maxMedicalAccessHours()));
        q.select(s).where(p.toArray(Predicate[]::new));
        var rank=cb.<Integer>selectCase().when(t.get("id").in(visited.isEmpty()?List.of(-1L):visited),1).otherwise(0);
        q.orderBy(cb.asc(rank),cb.asc(s.get("departureDate")),cb.asc(t.get("pricePerPax")),cb.asc(s.get("id")));
        return em.createQuery(q).setMaxResults(10).setHint("jakarta.persistence.query.timeout",4000).getResultList().stream().map(row -> {
            var tour=row.getTour();
            return new Option(tour.getId(),row.getId(),tour.getTitle(),tour.getSlug(),tour.getBannerUrl(),tour.getLocation(),
                    "/tours/"+tour.getSlug(),row.getDepartureDate(),row.getReturnDate(),
                    tour.getPricePerPax(),row.getAvailableSlots(),tour.getDifficultyLevel(),tour.getDurationDays(),
                    visited.contains(tour.getId()),tour.getAdventureProfile());
        }).toList();
    }
    public static void validate(Filter f) {
        if(f.destination()!=null && f.destination().length()>120 || f.people()!=null && (f.people()<1 || f.people()>50)
                || f.days()!=null && (f.days()<1 || f.days()>365) || f.fitness()!=null && (f.fitness()<1 || f.fitness()>3)
                || f.departure()!=null && (!f.departure().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))
                || f.departure().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusYears(2))))
            throw new IllegalArgumentException("Điểm đến, ngày đi, thời lượng, số người hoặc thể lực không hợp lệ.");
        limit(f.budgetPerPerson(),1000000000); limit(f.maxDistanceKm(),1000); limit(f.maxActiveHoursPerDay(),24); limit(f.maxMedicalAccessHours(),168);
    }
    private static void limit(BigDecimal n,int max) { if(n!=null && (n.signum()<0 || n.compareTo(BigDecimal.valueOf(max))>0 || n.stripTrailingZeros().scale()>2)) throw new IllegalArgumentException("Giới hạn tìm tour không hợp lệ."); }
}
