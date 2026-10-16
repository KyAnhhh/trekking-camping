package com.trekkingcamping.backend.module.booking.repository;

import com.trekkingcamping.backend.module.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Booking> {
    org.springframework.data.domain.Page<Booking> findByScheduleIdAndStatusInOrderByIdAsc(Long scheduleId,java.util.Collection<String> statuses,org.springframework.data.domain.Pageable page);
    @Query("select b.id from Booking b where b.id > :after and b.status='CONFIRMED' and b.schedule.departureDate=:day order by b.id")
    List<Long> reminderCandidates(@Param("after") Long after,@Param("day") java.time.LocalDate day,org.springframework.data.domain.Pageable page);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"schedule", "schedule.tour"})
    org.springframework.data.domain.Page<Booking> findAll(org.springframework.data.jpa.domain.Specification<Booking> spec, org.springframework.data.domain.Pageable pageable);
    @Query("select b.status, count(b) from Booking b group by b.status")
    List<Object[]> statusCounts();
    long countByStatusAndParticipationStatus(String status,String participationStatus);
    @Query("select distinct b.schedule.tour.id from Booking b where b.user.id = :userId and b.status = 'COMPLETED'")
    List<Long> completedTourIds(@Param("userId") Long userId);
    @Query("""
        select b from Booking b where b.status = 'PENDING' and b.participationDeadline < :deadline
        and not exists (select p.id from PaymentTransaction p where p.booking.id = b.id
            and p.status in ('PENDING','SUCCESS','REFUND_REQUIRED')) order by b.id
        """)
    List<Booking> participationExpiryCandidates(@Param("deadline") java.time.LocalDateTime deadline, org.springframework.data.domain.Pageable page);
    boolean existsByScheduleId(Long scheduleId);
    boolean existsByScheduleIdAndStatusNot(Long scheduleId, String status);
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Booking> findByBookingCode(String bookingCode);
    List<Booking> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);
}
