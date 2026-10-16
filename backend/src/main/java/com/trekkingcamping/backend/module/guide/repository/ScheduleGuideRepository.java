package com.trekkingcamping.backend.module.guide.repository;
import com.trekkingcamping.backend.module.guide.entity.ScheduleGuide;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.*;
public interface ScheduleGuideRepository extends JpaRepository<ScheduleGuide, Long> {
    boolean existsByScheduleIdAndGuideId(Long scheduleId,Long guideId);
    @EntityGraph(attributePaths={"schedule","schedule.tour"})
    org.springframework.data.domain.Page<ScheduleGuide> findByGuideIdOrderByScheduleDepartureDateDesc(Long guideId,org.springframework.data.domain.Pageable page);
    @Query("select a from ScheduleGuide a join fetch a.guide g join fetch a.schedule s join fetch s.tour t where t.isActive = true and s.departureDate > :today and (s.status = 'OPEN' or s.status = 'FULL') order by s.departureDate, s.id, a.role desc")
    List<ScheduleGuide> upcoming(@Param("today") LocalDate today, org.springframework.data.domain.Pageable limit);
    @Query("select a from ScheduleGuide a join fetch a.guide where a.schedule.id in :ids order by a.role desc, a.guide.fullName")
    List<ScheduleGuide> forSchedules(@Param("ids") Collection<Long> ids);
    @Query("select count(a) from ScheduleGuide a where a.guide.id = :guideId and a.schedule.id <> :scheduleId and (a.schedule.status is null or a.schedule.status <> 'CANCELLED') and a.schedule.departureDate <= :end and a.schedule.returnDate >= :start")
    long countConflicts(@Param("guideId") Long guideId, @Param("scheduleId") Long scheduleId, @Param("start") LocalDate start, @Param("end") LocalDate end);
    @Query("select count(a) from ScheduleGuide a where a.guide.id = :id and (a.schedule.status is null or a.schedule.status <> 'CANCELLED') and a.schedule.returnDate >= :today")
    long countFuture(@Param("id") Long id, @Param("today") LocalDate today);
}

