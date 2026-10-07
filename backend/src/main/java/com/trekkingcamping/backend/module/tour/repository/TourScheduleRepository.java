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
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TourSchedule s where s.id = :id")
    Optional<TourSchedule> findByIdForUpdate(@Param("id") Long id);
    List<TourSchedule> findByTourId(Long tourId);
    List<TourSchedule> findByTourIdInAndDepartureDateAfterOrderByDepartureDateAsc(List<Long> tourIds, java.time.LocalDate today);
       
    List<TourSchedule> findByTourIdAndStatus(Long tourId, String status);
}
