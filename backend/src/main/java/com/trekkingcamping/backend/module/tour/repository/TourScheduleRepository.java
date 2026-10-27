package com.trekkingcamping.backend.module.tour.repository;

import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface TourScheduleRepository extends JpaRepository<TourSchedule, Long> { 
    @Query("""
        select s from TourSchedule s join fetch s.tour t
        where t.isActive = true and s.status = 'OPEN' and s.availableSlots >= :people
        and s.departureDate = :start and s.returnDate <= :end
        and t.difficultyLevel <= :fitness and t.pricePerPax <= :budget
        and (:distance is null or t.adventureProfile.distanceKm <= :distance)
        and (:hours is null or t.adventureProfile.activeHoursPerDay <= :hours)
        and (:medical is null or t.adventureProfile.medicalAccessHours <= :medical)
        and (lower(t.location) like :search or lower(t.title) like :search)
        order by t.pricePerPax asc, s.id asc
        """)
    List<TourSchedule> findPlannerOptions(@Param("search") String search, @Param("start") java.time.LocalDate start,
            @Param("end") java.time.LocalDate end, @Param("people") int people, @Param("fitness") int fitness,
            @Param("budget") java.math.BigDecimal budget, @Param("distance") java.math.BigDecimal distance,
            @Param("hours") java.math.BigDecimal hours, @Param("medical") java.math.BigDecimal medical, org.springframework.data.domain.Pageable page);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TourSchedule s where s.id = :id")
    Optional<TourSchedule> findByIdForUpdate(@Param("id") Long id);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour"})
    List<TourSchedule> findByTourId(Long tourId);
    List<TourSchedule> findByTourIdInAndDepartureDateAfterOrderByDepartureDateAsc(List<Long> tourIds, java.time.LocalDate today);
       
    List<TourSchedule> findByTourIdAndStatus(Long tourId, String status);
}
